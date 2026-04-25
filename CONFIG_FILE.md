# Configuration File (.mmt.config)

The Markdown Media Tracker stores user preferences in a `.mmt.config` file located in your storage directory (either a local folder or your Google Drive folder). This file allows your settings to persist across sessions and be synced across devices when using Google Drive.

## File Format

The configuration file is stored as JSON with the following structure:

```json
{
  "themePrimary": "#0b1220",
  "themeHighlight": "#7c3aed",
  "cardSize": "medium",
  "halfStarsEnabled": true,
  "omdbApiKey": "your-api-key-here"
}
```

## Configuration Options

### Theme Settings

- **`themePrimary`** (string): The primary color used for backgrounds and UI elements. Default: `"#0b1220"` (dark navy)
- **`themeHighlight`** (string): The highlight/accent color used for interactive elements. Default: `"#7c3aed"` (purple)

### Display Settings

- **`cardSize`** (string): The size of media item cards. Options: `"tiny"`, `"small"`, `"medium"`, `"large"`, `"xlarge"`. Default: `"medium"`
- **`halfStarsEnabled`** (boolean): Whether to enable half-star ratings (e.g., 3.5 stars). Default: `true`

### API Keys

- **`omdbApiKey`** (string): Your OMDb API key for movie search functionality. Default: `""` (empty)

## How It Works

### Storage Priority

The application uses a two-tier configuration system:

1. **File-based config** (`.mmt.config` in your storage directory) - **Takes priority**
2. **localStorage** (browser storage) - Used as fallback when storage is not connected

When you connect to a storage location (local folder or Google Drive), the app will:

1. Check if a `.mmt.config` file exists in that location
2. If it exists, load settings from the file and apply them
3. If it doesn't exist, use settings from localStorage (or defaults)
4. When you change any setting, it saves to both the file and localStorage

### Cross-Device Sync

If you use **Google Drive storage**, your `.mmt.config` file is automatically synced across devices:

1. Device A: Change theme color → saves to `.mmt.config` in Google Drive
2. Device B: Connect to the same Google Drive folder → automatically loads the theme color from the file

### Manual Editing

You can manually edit the `.mmt.config` file if needed:

1. Locate the file in your storage directory (it's a hidden file, so you may need to show hidden files)
2. Edit it with any text editor
3. Ensure the JSON is valid
4. Reload the application or reconnect to storage

## Backward Compatibility

The configuration system maintains full backward compatibility:

- **Without storage connection**: Settings are stored in browser localStorage (as before)
- **With storage connection**: Settings are stored in both the file and localStorage
- **Migrating to file-based config**: Your existing localStorage settings will be used as defaults when you first connect to a storage location

## Example Workflows

### Setting Up on a New Device

1. Connect to your existing Google Drive folder
2. The `.mmt.config` file is automatically loaded
3. Your theme, card size, and all preferences are instantly applied

### Starting Fresh

1. Connect to a new storage location
2. No `.mmt.config` file exists yet
3. App uses your current settings (from localStorage or defaults)
4. First setting change creates the `.mmt.config` file

### Sharing Settings

1. Export your `.mmt.config` file from your storage directory
2. Share with another user
3. They can place it in their storage directory
4. App will load those settings when they connect

## Technical Notes

- The file is created automatically when you change any setting while connected to storage
- The file uses UTF-8 encoding
- The file starts with a dot (`.`) making it hidden on Unix-like systems
- Invalid JSON in the file will be ignored, and defaults will be used
- The app never deletes the config file, even if you disconnect from storage

## Security Note

The OMDb API key is stored in plain text in both localStorage and the `.mmt.config` file. This is intentional for the following reasons:

1. **User convenience**: The API key is user-provided and not a secret owned by the application. Requiring users to re-enter it every session would create poor user experience.

2. **Standard practice**: This follows the same pattern as the original implementation and is common for client-side applications where users manage their own API keys.

3. **Low risk**: The OMDb API key is a free, per-user API key with limited scope. It only allows access to public movie data and has built-in rate limiting.

4. **Privacy-first design**: The app is designed to be privacy-first with no server-side components. All data stays on the user's device or in their chosen storage location.

**Best Practices:**
- Don't share your `.mmt.config` file publicly if it contains your API key
- Treat your API key like a password - don't commit it to public repositories
- If your key is compromised, you can easily regenerate it at http://www.omdbapi.com/apikey.aspx
