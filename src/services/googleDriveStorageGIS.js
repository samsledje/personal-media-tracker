import { StorageAdapter } from './storageAdapter.js';
import { parseMarkdown, generateMarkdown } from '../utils/markdownUtils.js';
import { getConfig } from '../config.js';
import { driveCache } from './driveCache.js';

/**
 * Google Drive Storage Adapter using Google Identity Services (newer, more reliable)
 * Implements storage operations using Google Drive API
 */
export class GoogleDriveStorageGIS extends StorageAdapter {
  constructor() {
    super();
    this.isInitialized = false;
    this.isSignedIn = false;
    this.accessToken = null;
    this.mediaTrackerFolderId = null;
    this.trashFolderId = null;
    this.userEmail = null;
    
    // Google API configuration
    this.CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
  }

  static isSupported() {
    return typeof window !== 'undefined' && !!window.fetch;
  }

  getStorageType() {
    return 'googledrive';
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      if (!this.CLIENT_ID || !this.API_KEY) {
        const isDev = import.meta.env.DEV;
        const missingVars = [];
        if (!this.CLIENT_ID) missingVars.push('VITE_GOOGLE_CLIENT_ID');
        if (!this.API_KEY) missingVars.push('VITE_GOOGLE_API_KEY');
        
        const errorMessage = isDev 
          ? `Google API credentials not configured. Missing: ${missingVars.join(', ')}. Please check your .env.local file.`
          : `Google API credentials not configured. Missing: ${missingVars.join(', ')}. This might be a deployment configuration issue.`;
        
        throw new Error(errorMessage);
      }

      console.log('Initializing Google Identity Services...');

      // Suppress COOP warnings in development
      if (import.meta.env.DEV) {
        const originalWarn = console.warn;
        console.warn = (message, ...args) => {
          if (typeof message === 'string' && message.includes('Cross-Origin-Opener-Policy')) {
            return; // Suppress COOP warnings in development
          }
          originalWarn(message, ...args);
        };
      }

      // Load Google Identity Services
      await this._loadGoogleIdentityServices();
      
      // Initialize the Google API client for Drive API calls
      await this._loadGoogleAPI();
      await window.gapi.load('client', async () => {
        await window.gapi.client.init({
          apiKey: this.API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        });
      });

      this.isInitialized = true;
      
      // Restore user email from localStorage if available
      const savedEmail = localStorage.getItem('googleDriveUserEmail');
      if (savedEmail) {
        this.userEmail = savedEmail;
        console.log('Restored user email from localStorage:', this.userEmail);
      }
      
      console.log('Google Identity Services initialization complete');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Identity Services:', error);
      return false;
    }
  }

  async _loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        console.log('Google Identity Services loaded');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load Google Identity Services:', error);
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.head.appendChild(script);
    });
  }

  async _loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        console.log('Google API script loaded');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load Google API script:', error);
        reject(new Error('Failed to load Google API script'));
      };
      document.head.appendChild(script);
    });
  }

  async _fetchUserInfo() {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch user info:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      if (data.user && data.user.emailAddress) {
        this.userEmail = data.user.emailAddress;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Don't throw - user email is optional
    }
  }

  isConnected() {
    return this.isInitialized && this.isSignedIn && !!this.accessToken && !!this.mediaTrackerFolderId;
  }

  getStorageInfo() {
    if (!this.isConnected()) return null;
    
    const folderName = getConfig('googleDriveFolderName') || 'MediaTracker';
    return {
      account: this.userEmail,
      folder: folderName
    };
  }

  async selectStorage(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Default to showing the popup (prompt: 'select_account')
    // For silent reconnection, pass { silent: true }
    const prompt = options.silent ? '' : 'select_account';

    return new Promise((resolve, reject) => {
      console.log('Starting Google Sign-In with Identity Services...', options.silent ? '(silent)' : '(with popup)');
      
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        prompt: prompt,
        callback: async (tokenResponse) => {
          try {
            console.log('Token received:', !!tokenResponse.access_token);
            this.accessToken = tokenResponse.access_token;
            this.isSignedIn = true;

            // Set the access token for gapi client
            window.gapi.client.setToken({ access_token: this.accessToken });

            // Fetch user info
            console.log('Fetching user information...');
            await this._fetchUserInfo();
            console.log('User email:', this.userEmail);

            console.log('Starting folder initialization...');
            await this._initializeFolders();
            console.log('Folder initialization complete. MediaTracker folder ID:', this.mediaTrackerFolderId);
            
            localStorage.setItem('googleDriveConnected', 'true');
            localStorage.setItem('googleDriveFolderId', this.mediaTrackerFolderId);
            if (this.userEmail) {
              localStorage.setItem('googleDriveUserEmail', this.userEmail);
            }
            
            const folderName = getConfig('googleDriveFolderName') || 'MediaTracker';
            console.log('Google Drive connection successful, resolving...');
            resolve({
              folderId: this.mediaTrackerFolderId,
              folderName: folderName
            });
          } catch (error) {
            console.error('Error after token received:', error);
            reject(new Error(`Failed to initialize Google Drive: ${error.message}`));
          }
        },
        error_callback: (error) => {
          console.error('OAuth error:', error);
          if (error.type === 'popup_closed') {
            reject(new Error('Sign-in popup was closed. Please try again.'));
          } else {
            reject(new Error(`Authentication failed: ${error.type || 'Unknown error'}`));
          }
        }
      });

      // Request access token
      client.requestAccessToken();
    });
  }

  /**
   * Try to reconnect to Google Drive silently (without showing OAuth popup)
   * This uses the user's existing Google session cookies to get a new token
   * 
   * How it works:
   * - Uses prompt: '' to attempt silent token acquisition
   * - If user is still signed in to Google in their browser, this succeeds without UI
   * - If user signed out of Google or session expired, this fails and user must sign in again
   * - This provides seamless reconnection when user returns to app in same browser session
   * 
   * @returns {Promise} Resolves if reconnection succeeds, rejects if silent auth fails
   */
  async tryReconnect() {
    console.log('Attempting silent reconnection to Google Drive...');
    
    try {
      // Use silent mode which won't show any UI
      const result = await this.selectStorage({ silent: true });
      console.log('Silent reconnection successful');
      return result;
    } catch (error) {
      console.log('Silent reconnection failed:', error.message);
      // Clear the connection flags since silent reconnection failed
      localStorage.removeItem('googleDriveConnected');
      localStorage.removeItem('googleDriveFolderId');
      throw error;
    }
  }

  async disconnect() {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken);
    }
    
    // DON'T clear cache on disconnect - we want it to persist!
    // Users can manually clear cache via the UI if needed
    
    this.isSignedIn = false;
    this.accessToken = null;
    this.mediaTrackerFolderId = null;
    this.trashFolderId = null;
    this.userEmail = null;
    
    localStorage.removeItem('googleDriveConnected');
    localStorage.removeItem('googleDriveFolderId');
    localStorage.removeItem('googleDriveUserEmail');
  }

  /**
   * Clear the cache for this folder (force refresh on next load)
   */
  async clearCache() {
    if (this.mediaTrackerFolderId) {
      try {
        await driveCache.clearFolderCache(this.mediaTrackerFolderId);
        console.log('Cache cleared successfully');
      } catch (error) {
        console.error('Error clearing cache:', error);
        throw error;
      }
    }
  }

  // Rest of the methods remain the same as the original implementation
  async _initializeFolders() {
    try {
      console.log('_initializeFolders: Starting...');
      // Get configured folder name, fallback to 'MediaTracker' for backward compatibility
      const folderName = getConfig('googleDriveFolderName') || 'MediaTracker';
      console.log('_initializeFolders: Using folder name:', folderName);
      
      console.log('_initializeFolders: Finding/creating main folder...');
      this.mediaTrackerFolderId = await this._findOrCreateFolder(folderName);
      console.log('_initializeFolders: Main folder ID:', this.mediaTrackerFolderId);
      
      console.log('_initializeFolders: Finding/creating trash folder...');
      this.trashFolderId = await this._findOrCreateFolder('.trash', this.mediaTrackerFolderId);
      console.log('_initializeFolders: Trash folder ID:', this.trashFolderId);
      console.log('_initializeFolders: Complete');
    } catch (error) {
      console.error('Error initializing Google Drive folders:', error);
      throw error;
    }
  }

  async _findOrCreateFolder(name, parentId = null) {
    try {
      console.log(`_findOrCreateFolder: Looking for folder "${name}" with parent:`, parentId || 'root');
      let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      } else {
        query += ` and parents in 'root'`;
      }

      console.log('_findOrCreateFolder: Search query:', query);
      const searchResponse = await window.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name)'
      });

      console.log('_findOrCreateFolder: Search response:', searchResponse.result);
      if (searchResponse.result.files.length > 0) {
        console.log(`_findOrCreateFolder: Found existing folder "${name}" with ID:`, searchResponse.result.files[0].id);
        return searchResponse.result.files[0].id;
      }

      console.log(`_findOrCreateFolder: Creating new folder "${name}"`);
      const folderMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : ['root']
      };

      const createResponse = await window.gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      console.log(`_findOrCreateFolder: Created folder "${name}" with ID:`, createResponse.result.id);
      return createResponse.result.id;
    } catch (error) {
      console.error(`Error finding/creating folder ${name}:`, error);
      throw error;
    }
  }

  async loadItems(onProgress = null) {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      console.log('loadItems: Starting to load items from Google Drive...');
      console.log('loadItems: Searching in folder:', this.mediaTrackerFolderId);
      
      // Get ALL files from Drive using pagination (handles folders with >100 files)
      const files = [];
      let pageToken = null;
      let pageCount = 0;
      
      do {
        pageCount++;
        console.log(`loadItems: Fetching file list page ${pageCount}${pageToken ? ' (continuation)' : ''}...`);
        
        const response = await window.gapi.client.drive.files.list({
          q: `'${this.mediaTrackerFolderId}' in parents and name contains '.md' and trashed=false`,
          fields: 'nextPageToken, files(id, name, modifiedTime)',
          orderBy: 'modifiedTime desc',
          pageSize: 1000, // Max allowed by Google Drive API
          pageToken: pageToken
        });

        files.push(...response.result.files);
        pageToken = response.result.nextPageToken;
        
        console.log(`loadItems: Page ${pageCount} returned ${response.result.files.length} files (total so far: ${files.length})`);
      } while (pageToken);

      const totalFiles = files.length;
      console.log('loadItems: Found files:', totalFiles);
      
      if (totalFiles === 0) {
        return [];
      }

      // Get cached items
      const cachedItemsMap = await driveCache.getCachedItems(this.mediaTrackerFolderId);
      console.log('loadItems: Found cached items:', Object.keys(cachedItemsMap).length);
      console.log('loadItems: Cache keys:', Object.keys(cachedItemsMap).slice(0, 3)); // Show first 3 for debugging

      // Determine which files need to be downloaded
      const filesToDownload = [];
      const itemsFromCache = [];
      
      files.forEach(file => {
        const cached = cachedItemsMap[file.id];
        if (cached && cached.modifiedTime === file.modifiedTime) {
          // Use cached version
          console.log(`✓ Cache HIT for ${file.name} (${file.modifiedTime})`);
          itemsFromCache.push(cached.data);
        } else {
          // Need to download (new or modified)
          if (cached) {
            console.log(`✗ Cache STALE for ${file.name} - cached: ${cached.modifiedTime}, drive: ${file.modifiedTime}`);
          } else {
            console.log(`✗ Cache MISS for ${file.name} (${file.id})`);
          }
          filesToDownload.push(file);
        }
      });

      console.log(`loadItems: Using ${itemsFromCache.length} cached items, downloading ${filesToDownload.length} files`);

      const items = [...itemsFromCache];
      let processedCount = itemsFromCache.length;
      const itemsToCache = [];

      // Report initial progress with cached items
      if (typeof onProgress === 'function' && itemsFromCache.length > 0) {
        try {
          onProgress({
            processed: processedCount,
            total: totalFiles,
            items: [...items]
          });
        } catch (err) {
          console.error('Error in onProgress callback:', err);
        }
      }

      // Download files that aren't cached or have changed
      if (filesToDownload.length > 0) {
        const BATCH_SIZE = 100; // Download 100 files concurrently (HTTP/2 multiplexing handles this well)
        
        for (let batchStart = 0; batchStart < filesToDownload.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, filesToDownload.length);
          const batch = filesToDownload.slice(batchStart, batchEnd);
          
          console.log(`loadItems: Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (files ${batchStart + 1}-${batchEnd} of ${filesToDownload.length})`);
          
          // Download all files in this batch in parallel
          const batchPromises = batch.map(async (file) => {
            try {
              const content = await this._downloadFile(file.id);
              const { metadata, body } = parseMarkdown(content);
              
              const item = {
                id: file.name.replace('.md', ''),
                filename: file.name,
                status: metadata.status,
                fileId: file.id,
                title: metadata.title || 'Untitled',
                type: metadata.type || 'book',
                author: metadata.author,
                director: metadata.director,
                actors: metadata.actors || [],
                isbn: metadata.isbn,
                year: metadata.year,
                rating: metadata.rating,
                tags: metadata.tags || [],
                coverUrl: metadata.coverUrl,
                dateRead: metadata.dateRead,
                dateWatched: metadata.dateWatched,
                dateAdded: metadata.dateAdded,
                review: body
              };

              // Queue for caching
              itemsToCache.push({
                fileId: file.id,
                modifiedTime: file.modifiedTime,
                filename: file.name,
                data: item
              });

              return item;
            } catch (error) {
              console.error(`Error loading file ${file.name}:`, error);
              return null;
            }
          });
          
          // Wait for all files in this batch to complete
          const batchResults = await Promise.allSettled(batchPromises);
          
          // Add successfully loaded items
          batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              items.push(result.value);
            }
            processedCount++;
          });
          
          // Report progress after each batch
          if (typeof onProgress === 'function') {
            try {
              onProgress({
                processed: processedCount,
                total: totalFiles,
                items: [...items]
              });
            } catch (err) {
              console.error('Error in onProgress callback:', err);
            }
          }
        }

        // Update cache with newly downloaded items
        if (itemsToCache.length > 0) {
          try {
            console.log(`loadItems: Caching ${itemsToCache.length} items for folder ${this.mediaTrackerFolderId}`);
            console.log('loadItems: Sample item to cache:', itemsToCache[0]?.fileId, itemsToCache[0]?.modifiedTime);
            await driveCache.cacheItems(this.mediaTrackerFolderId, itemsToCache);
            console.log(`loadItems: Successfully cached ${itemsToCache.length} items`);
          } catch (error) {
            console.error('Error updating cache:', error);
            // Don't fail the entire load if caching fails
          }
        }
      }

      console.log(`loadItems: Successfully loaded ${items.length} items (${itemsFromCache.length} from cache, ${filesToDownload.length} downloaded)`);
      return items.sort((a, b) => 
        new Date(b.dateAdded) - new Date(a.dateAdded)
      );
    } catch (error) {
      console.error('Error loading items from Google Drive:', error);
      throw new Error(`Failed to load items: ${error.message}`);
    }
  }

  async _downloadFile(fileId) {
    try {
      console.log(`_downloadFile: Downloading file ${fileId}...`);
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      console.log(`_downloadFile: Successfully downloaded file ${fileId}`);
      return response.body;
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }

  async saveItem(item) {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      const filename = item.filename || `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.md`;
      const content = generateMarkdown(item);

      // Ensure the item object contains the filename for subsequent updates
      item.filename = filename;

      if (item.fileId) {
        await this._updateFile(item.fileId, content, filename);
      } else {
        // Try to find an existing file with the same name in the mediaTracker folder
        try {
          const res = await window.gapi.client.drive.files.list({
            q: `name='${filename.replace(/'/g, "\\'")}' and '${this.mediaTrackerFolderId}' in parents and trashed=false`,
            fields: 'files(id, name)'
          });
          if (res.result && res.result.files && res.result.files.length > 0) {
            const existingFile = res.result.files[0];
            item.fileId = existingFile.id;
            console.debug('[Storage][GDrive] updating existing file with id', item.fileId, 'name', filename);
            await this._updateFile(item.fileId, content, filename);
          } else {
            console.debug('[Storage][GDrive] creating new file', filename);
            const fileId = await this._createFile(filename, content, this.mediaTrackerFolderId);
            item.fileId = fileId;
          }
        } catch (err) {
          // On any error, fall back to creating a new file
          const fileId = await this._createFile(filename, content, this.mediaTrackerFolderId);
          item.fileId = fileId;
        }
      }

      // Invalidate cache for this item (will be refreshed on next load)
      if (item.fileId) {
        try {
          await driveCache.removeCachedItem(item.fileId);
        } catch (error) {
          console.warn('Error invalidating cache after save:', error);
          // Don't fail save if cache invalidation fails
        }
      }
    } catch (error) {
      console.error('Error saving item to Google Drive:', error);
      throw new Error(`Failed to save item: ${error.message}`);
    }
  }

  async _createFile(name, content, parentId) {
    try {
      const metadata = {
        name: name,
        parents: [parentId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
      form.append('file', new Blob([content], {type: 'text/markdown'}));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  async _updateFile(fileId, content, name = null) {
    try {
      const metadata = name ? { name } : {};
      
      const form = new FormData();
      if (Object.keys(metadata).length > 0) {
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
      }
      form.append('file', new Blob([content], {type: 'text/markdown'}));

      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }

  async deleteItem(item) {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      if (!item.fileId) {
        throw new Error('Item does not have a Google Drive file ID');
      }

      await window.gapi.client.drive.files.update({
        fileId: item.fileId,
        addParents: this.trashFolderId,
        removeParents: this.mediaTrackerFolderId,
        fields: 'id, parents'
      });

      // Remove from cache
      try {
        await driveCache.removeCachedItem(item.fileId);
      } catch (error) {
        console.warn('Error removing from cache after delete:', error);
        // Don't fail delete if cache removal fails
      }

      return {
        fileId: item.fileId,
        filename: item.filename,
        fromFolder: this.mediaTrackerFolderId,
        toFolder: this.trashFolderId
      };
    } catch (error) {
      console.error('Error deleting item from Google Drive:', error);
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }

  async restoreItem(undoInfo) {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      await window.gapi.client.drive.files.update({
        fileId: undoInfo.fileId,
        addParents: undoInfo.fromFolder,
        removeParents: undoInfo.toFolder,
        fields: 'id, parents'
      });

      return undoInfo.filename;
    } catch (error) {
      console.error('Error restoring item from Google Drive:', error);
      throw new Error(`Failed to restore item: ${error.message}`);
    }
  }

  /**
   * Write an arbitrary file (e.g., Obsidian Base) into the media tracker folder
   * If a file with the same name exists, overwrite it.
   * @param {string} filename
   * @param {string} content
   */
  async writeFile(filename, content) {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      // Check for existing file with the same name
      const searchResponse = await window.gapi.client.drive.files.list({
        q: `name='${filename}' and '${this.mediaTrackerFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      if (searchResponse.result.files && searchResponse.result.files.length > 0) {
        // Update existing file
        const fileId = searchResponse.result.files[0].id;
        await this._updateFile(fileId, content, filename);
      } else {
        // Create new file
        await this._createFile(filename, content, this.mediaTrackerFolderId);
      }
    } catch (error) {
      console.error('Error writing file to Google Drive:', error);
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async fileExists(filename) {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name='${filename}' and '${this.mediaTrackerFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      return response.result.files && response.result.files.length > 0;
    } catch (error) {
      console.error('Error checking file existence on Google Drive:', error);
      return false;
    }
  }

  // Method to check if a folder name is available or conflicts exist
  async checkFolderAvailability(folderName) {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and parents in 'root'&fields=files(id,name,modifiedTime)`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const existingFolders = data.files || [];
      
      return {
        isAvailable: existingFolders.length === 0,
        existingFolders: existingFolders,
        recommendation: existingFolders.length > 0 
          ? `A folder named "${folderName}" already exists. The app will use this existing folder.`
          : `A new folder named "${folderName}" will be created.`
      };
    } catch (error) {
      console.error('Error checking folder availability:', error);
      return {
        isAvailable: false,
        existingFolders: [],
        recommendation: 'Unable to check folder availability. The app will attempt to use or create the folder.'
      };
    }
  }

  // Method to check if there are files in a specific folder
  async checkFolderContents(folderId) {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name contains '.md' and trashed=false&fields=files(id,name)&pageSize=10`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const files = data.files || [];

      return {
        hasFiles: files.length > 0,
        fileCount: files.length,
        files: files
      };
    } catch (error) {
      console.error('Error checking folder contents:', error);
      return {
        hasFiles: false,
        fileCount: 0,
        files: []
      };
    }
  }

  /**
   * List all items in the trash folder
   * @returns {Promise<object[]>} Array of trashed items with metadata
   */
  async listTrash() {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${this.trashFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, size, modifiedTime)',
        orderBy: 'modifiedTime desc'
      });

      const files = response.result.files || [];
      const trashedItems = [];

      for (const file of files) {
        if (file.name.endsWith('.md')) {
          try {
            const content = await this._getFileContent(file.id);
            const { metadata } = parseMarkdown(content);

            trashedItems.push({
              id: file.id,
              filename: file.name,
              title: metadata.title || 'Untitled',
              type: metadata.type || 'book',
              author: metadata.author,
              director: metadata.director,
              year: metadata.year,
              deletedAt: new Date(file.modifiedTime).getTime(),
              size: file.size
            });
          } catch (err) {
            console.error(`Error loading trash item ${file.name}:`, err);
          }
        }
      }

      return trashedItems;
    } catch (error) {
      console.error('Error listing trash:', error);
      throw new Error(`Error listing trash: ${error.message}`);
    }
  }

  /**
   * Restore an item from trash by filename
   * @param {string} filename - Filename of the item to restore
   * @returns {Promise<string>} Restored item identifier
   */
  async restoreFromTrash(filename) {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      // Find the file in trash folder
      const searchResponse = await window.gapi.client.drive.files.list({
        q: `name='${filename.replace(/'/g, "\\'")}' and '${this.trashFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      if (!searchResponse.result.files || searchResponse.result.files.length === 0) {
        throw new Error(`File ${filename} not found in trash`);
      }

      const file = searchResponse.result.files[0];

      // Check if a file with the same name already exists in the main folder
      const existingResponse = await window.gapi.client.drive.files.list({
        q: `name='${filename.replace(/'/g, "\\'")}' and '${this.mediaTrackerFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      let restoreName = filename;
      if (existingResponse.result.files && existingResponse.result.files.length > 0) {
        // Generate a new name with timestamp
        restoreName = `${filename.replace(/\.md$/, '')}-restored-${Date.now()}.md`;
        
        // Rename the file
        await window.gapi.client.drive.files.update({
          fileId: file.id,
          resource: {
            name: restoreName
          },
          fields: 'id, name'
        });
      }

      // Move file from trash to main folder
      await window.gapi.client.drive.files.update({
        fileId: file.id,
        addParents: this.mediaTrackerFolderId,
        removeParents: this.trashFolderId,
        fields: 'id, parents'
      });

      return restoreName;
    } catch (error) {
      console.error('Error restoring from trash:', error);
      throw new Error(`Error restoring file: ${error.message}`);
    }
  }

  /**
   * Permanently delete all items from trash
   * @returns {Promise<number>} Number of items deleted
   */
  async emptyTrash() {
    if (!this.isConnected()) {
      throw new Error('Not connected to Google Drive');
    }

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${this.trashFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      const files = response.result.files || [];
      let deleteCount = 0;

      for (const file of files) {
        if (file.name.endsWith('.md')) {
          try {
            await window.gapi.client.drive.files.delete({
              fileId: file.id
            });
            deleteCount++;
          } catch (err) {
            console.error(`Error deleting ${file.name}:`, err);
          }
        }
      }

      return deleteCount;
    } catch (error) {
      console.error('Error emptying trash:', error);
      throw new Error(`Error emptying trash: ${error.message}`);
    }
  }

  // Method to get information about current vs new folder for migration warnings
  async getMigrationInfo(newFolderName) {
    try {
      const currentFolderName = getConfig('googleDriveFolderName') || 'MediaTracker';
      
      // If the folder name isn't changing, no migration needed
      if (currentFolderName === newFolderName) {
        return {
          migrationNeeded: false,
          currentFolder: { name: currentFolderName, hasFiles: false },
          newFolder: { name: newFolderName, exists: true }
        };
      }

      // Check current folder contents
      let currentFolderInfo = { name: currentFolderName, hasFiles: false, fileCount: 0 };
      if (this.mediaTrackerFolderId) {
        const currentContents = await this.checkFolderContents(this.mediaTrackerFolderId);
        currentFolderInfo.hasFiles = currentContents.hasFiles;
        currentFolderInfo.fileCount = currentContents.fileCount;
      }

      // Check if new folder exists and its contents
      const newFolderAvailability = await this.checkFolderAvailability(newFolderName);
      let newFolderInfo = { 
        name: newFolderName, 
        exists: !newFolderAvailability.isAvailable,
        hasFiles: false,
        fileCount: 0
      };

      if (newFolderAvailability.existingFolders.length > 0) {
        const newFolderId = newFolderAvailability.existingFolders[0].id;
        const newContents = await this.checkFolderContents(newFolderId);
        newFolderInfo.hasFiles = newContents.hasFiles;
        newFolderInfo.fileCount = newContents.fileCount;
      }

      return {
        migrationNeeded: true,
        currentFolder: currentFolderInfo,
        newFolder: newFolderInfo,
        recommendation: this._getMigrationRecommendation(currentFolderInfo, newFolderInfo)
      };
    } catch (error) {
      console.error('Error getting migration info:', error);
      return {
        migrationNeeded: false,
        currentFolder: { name: 'Unknown', hasFiles: false },
        newFolder: { name: newFolderName, exists: false },
        recommendation: 'Unable to check migration requirements.'
      };
    }
  }

  _getMigrationRecommendation(currentFolder, newFolder) {
    if (!currentFolder.hasFiles && !newFolder.hasFiles) {
      return 'No files will be affected. The app will start using the new folder.';
    } else if (currentFolder.hasFiles && !newFolder.hasFiles) {
      return `Your ${currentFolder.fileCount} files will remain in the "${currentFolder.name}" folder. You'll need to manually move them to "${newFolder.name}" if you want to keep them.`;
    } else if (!currentFolder.hasFiles && newFolder.hasFiles) {
      return `The app will start using the existing "${newFolder.name}" folder which contains ${newFolder.fileCount} files.`;
    } else {
      return `Both folders contain files. Your current ${currentFolder.fileCount} files will remain in "${currentFolder.name}". The app will switch to "${newFolder.name}" which contains ${newFolder.fileCount} files.`;
    }
  }
}