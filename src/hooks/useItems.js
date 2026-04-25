import { useState, useEffect } from 'react';
import { StorageFactory } from '../services/storageAdapter.js';
import { toast } from '../services/toastService.js';

/**
 * Custom hook for managing items (books/movies) with storage adapter pattern
 * @returns {object} Items state and actions
 */
export const useItems = () => {
  const [items, setItems] = useState([]);
  const [storageAdapter, setStorageAdapter] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ processed: 0, total: 0 });

  /**
   * Initialize storage adapter
   */
  const initializeStorage = async (preferredType = null) => {
    try {
      setIsLoading(true);
      const adapter = await StorageFactory.createAdapter(preferredType);
      await adapter.initialize();
      setStorageAdapter(adapter);
      return adapter;
    } catch (error) {
      console.error('Error initializing storage:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load items from storage
   * @param {StorageAdapter} adapter - Storage adapter to load from
   * @param {Function} onProgress - Optional callback(progress) for progressive loading
   */
  const loadItems = async (adapter = storageAdapter, onProgress = null) => {
    if (!adapter || !adapter.isConnected()) return;
    
    try {
      setIsLoading(true);
      setLoadProgress({ processed: 0, total: 0 });
      
      // Create progress handler that updates state progressively
      const progressHandler = (progress) => {
        // Update load progress state
        setLoadProgress({
          processed: progress.processed || 0,
          total: progress.total || 0
        });
        
        // Update items state with partial results
        if (progress.items && progress.items.length > 0) {
          setItems(progress.items);
        }
        
        // Call user-provided progress callback
        if (typeof onProgress === 'function') {
          onProgress(progress);
        }
      };
      
      const loadedItems = await adapter.loadItems(progressHandler);
      setItems(loadedItems);
      setStorageInfo(adapter.getStorageInfo());
      setLoadProgress({ processed: loadedItems.length, total: loadedItems.length });
    } catch (error) {
      console.error('Error loading items:', error);
      toast(`Error loading items: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save an item
   */
  const saveItem = async (item) => {
    if (!storageAdapter || !storageAdapter.isConnected()) {
      throw new Error('Please connect to a storage location first');
    }

    try {
      setIsLoading(true);
      await storageAdapter.saveItem(item);
      
      // Ensure the item has an id (derived from filename for new items)
      if (!item.id && item.filename) {
        item.id = item.filename.replace('.md', '');
      }
      
      // Update local state instead of reloading entire directory
      setItems(prevItems => {
        const existingIndex = prevItems.findIndex(i => i.id === item.id);
        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...prevItems];
          updated[existingIndex] = { ...updated[existingIndex], ...item };
          return updated;
        } else {
          // Add new item
          return [item, ...prevItems];
        }
      });
    } catch (error) {
      console.error('Error saving item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete an item (move to trash)
   */
  const deleteItem = async (item) => {
    if (!storageAdapter || !storageAdapter.isConnected()) {
      throw new Error('Please connect to a storage location first');
    }

    try {
      setIsLoading(true);
      const undoInfo = await storageAdapter.deleteItem(item);
      setUndoStack(prev => [...prev, undoInfo]);
      
      // Update local state instead of reloading entire directory
      setItems(prevItems => prevItems.filter(i => i.id !== item.id));
      
      return undoInfo;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete multiple items (parallel processing)
   */
  const deleteItems = async (itemsToDelete) => {
    if (!storageAdapter || !storageAdapter.isConnected()) {
      throw new Error('Please connect to a storage location first');
    }

    setIsLoading(true);
    const undoInfos = [];
    const deletedIds = [];
    
    // Process deletions in parallel with batches
    const BATCH_SIZE = 10; // Process 10 deletions concurrently
    
    for (let batchStart = 0; batchStart < itemsToDelete.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, itemsToDelete.length);
      const batch = itemsToDelete.slice(batchStart, batchEnd);
      
      console.log(`Deleting batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (items ${batchStart + 1}-${batchEnd} of ${itemsToDelete.length})`);
      
      // Delete all items in this batch in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          const undoInfo = await storageAdapter.deleteItem(item);
          return { success: true, undoInfo, id: item.id };
        } catch (error) {
          console.error('Error deleting item:', item.title, error);
          return { success: false, error, id: item.id };
        }
      });
      
      // Wait for all deletions in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful deletions
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          undoInfos.push(result.value.undoInfo);
          deletedIds.push(result.value.id);
        }
      });
    }

    if (undoInfos.length > 0) {
      setUndoStack(prev => [...prev, ...undoInfos]);
      
      // Update local state instead of reloading entire directory
      setItems(prevItems => prevItems.filter(item => !deletedIds.includes(item.id)));
    }
    
    setIsLoading(false);
    return undoInfos;
  };

  /**
   * Undo last delete operation
   */
  const undoLastDelete = async () => {
    if (!storageAdapter || !storageAdapter.isConnected() || undoStack.length === 0) {
      return null;
    }

    const lastUndo = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    try {
      setIsLoading(true);
      const restoredIdentifier = await storageAdapter.restoreItem(lastUndo);
      
      // Reload items to restore the deleted item(s) since we don't have the full item data
      // in the undo stack (only fileId/filename). This is unavoidable for undo operations.
      await loadItems();
      
      return restoredIdentifier;
    } catch (error) {
      console.error('Error undoing delete:', error);
      // Put the undo back on the stack if restore failed
      setUndoStack(prev => [...prev, lastUndo]);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Select a new storage location
   */
  const selectStorage = async (storageType = null) => {
    try {
      setIsLoading(true);
      let adapter = storageAdapter;
      
      if (!adapter || (storageType && adapter.getStorageType() !== storageType)) {
        adapter = await StorageFactory.createAdapter(storageType);
        await adapter.initialize();
        setStorageAdapter(adapter);
      }
      
      const storageHandle = await adapter.selectStorage();
      await loadItems(adapter);
      return storageHandle;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting storage:', error);
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Disconnect from current storage
   */
  const disconnectStorage = async () => {
    if (storageAdapter) {
      try {
        await storageAdapter.disconnect();
      } catch (error) {
        // Handle disconnect errors gracefully
        console.error('Error disconnecting storage:', error);
      } finally {
        setStorageAdapter(null);
        setStorageInfo(null);
        setItems([]);
        setUndoStack([]);
      }
    }
  };

  /**
   * Get available storage options
   */
  const getAvailableStorageOptions = async () => {
    return await StorageFactory.getAvailableAdapters();
  };

  /**
   * Apply batch edits to multiple items (parallel processing)
   */
  const applyBatchEdit = async (selectedIds, changes) => {
    if (!storageAdapter || !storageAdapter.isConnected()) {
      throw new Error('Please connect to a storage location first');
    }

    setIsLoading(true);
    const updatedItems = [];
    
    // Prepare all items to edit
    const itemsToEdit = [];
    for (const id of selectedIds) {
      const item = items.find(i => i.id === id);
      if (!item) continue;

      const newItem = { ...item };

      // Apply only fields present in changes (non-empty)
      if (changes.type) newItem.type = changes.type;
      if (changes.author) newItem.author = changes.author;
      if (changes.director) newItem.director = changes.director;
      if (changes.year) newItem.year = changes.year;
      if (changes.rating !== null && changes.rating !== undefined) newItem.rating = changes.rating;
      if (changes.addTags && changes.addTags.length) {
        newItem.tags = Array.from(new Set([...(newItem.tags || []), ...changes.addTags]));
      }
      if (changes.removeTags && changes.removeTags.length) {
        newItem.tags = (newItem.tags || []).filter(t => !changes.removeTags.includes(t));
      }
      if (changes.dateRead) newItem.dateRead = changes.dateRead;
      if (changes.dateWatched) newItem.dateWatched = changes.dateWatched;

      itemsToEdit.push(newItem);
    }

    // Process edits in parallel with batches
    const BATCH_SIZE = 10; // Process 10 edits concurrently
    
    for (let batchStart = 0; batchStart < itemsToEdit.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, itemsToEdit.length);
      const batch = itemsToEdit.slice(batchStart, batchEnd);
      
      console.log(`Editing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (items ${batchStart + 1}-${batchEnd} of ${itemsToEdit.length})`);
      
      // Save all items in this batch in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          await storageAdapter.saveItem(item);
          return { success: true, item };
        } catch (error) {
          console.error('Error updating item:', item.title, error);
          return { success: false, error, item };
        }
      });
      
      // Wait for all edits in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful edits
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          updatedItems.push(result.value.item);
        }
      });
    }

    if (updatedItems.length > 0) {
      // Update local state instead of reloading entire directory
      setItems(prevItems => {
        const itemsMap = new Map(prevItems.map(item => [item.id, item]));
        updatedItems.forEach(item => itemsMap.set(item.id, item));
        return Array.from(itemsMap.values());
      });
    }
    
    setIsLoading(false);
    return updatedItems.map(item => item.id);
  };

  return {
    items,
    storageAdapter,
    storageInfo,
    isLoading,
    loadProgress,
    undoStack: undoStack.length,
    initializeStorage,
    loadItems,
    saveItem,
    deleteItem,
    deleteItems,
    undoLastDelete,
    selectStorage,
    disconnectStorage,
    getAvailableStorageOptions,
    applyBatchEdit,
    refreshStorageAdapter: (adapter) => setStorageAdapter(adapter)
  };
};