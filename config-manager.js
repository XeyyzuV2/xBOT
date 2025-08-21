import fs from 'fs/promises';
import path from 'path';

const configDir = path.join(process.cwd(), 'data', 'groups');
const defaultConfig = {
  lang: 'id',
  premiumUntil: null,
  welcome: {
    enabled: false,
    message: 'Selamat datang {first_name} di grup {group_name}!',
  },
  verify: {
    enabled: false,
    action: 'mute', // 'mute' or 'kick'
  },
  antiSpam: {
    enabled: false,
    flood: {
      count: 10,
      windowSec: 5,
    },
    linkWhitelist: [],
  },
  log: {
    channelId: null,
  },
};

// Ensure the config directory exists
fs.mkdir(configDir, { recursive: true }).catch(console.error);

/**
 * Gets the configuration for a specific group.
 * @param {string|number} chatId The ID of the group.
 * @returns {Promise<object>} The group's configuration object.
 */
export async function getGroupConfig(chatId) {
  const filePath = path.join(configDir, `${chatId}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    // Merge with default config to ensure all keys are present
    return { ...defaultConfig, ...JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default config
      return { ...defaultConfig };
    }
    console.error(`Error reading config for chat ${chatId}:`, error);
    // Return default config on any other read error
    return { ...defaultConfig };
  }
}

/**
 * Sets the configuration for a specific group.
 * @param {string|number} chatId The ID of the group.
 * @param {object} newConfig The new configuration object to save.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function setGroupConfig(chatId, newConfig) {
  const filePath = path.join(configDir, `${chatId}.json`);
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  try {
    const data = JSON.stringify(newConfig, null, 2);
    await fs.writeFile(tempPath, data, 'utf-8');
    await fs.rename(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`Error writing config for chat ${chatId}:`, error);
    // Attempt to clean up the temp file if it exists
    try {
        await fs.unlink(tempPath);
    } catch (cleanupError) {
        // Ignore cleanup error
    }
    return false;
  }
}

/**
 * Scans all group configs and counts the number of active premium groups.
 * @returns {Promise<number>} The number of active premium groups.
 */
export async function countActivePremium() {
    let count = 0;
    try {
        const files = await fs.readdir(configDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(configDir, file);
                try {
                    const data = await fs.readFile(filePath, 'utf-8');
                    const config = JSON.parse(data);
                    if (config.premiumUntil && config.premiumUntil > Date.now()) {
                        count++;
                    }
                } catch (e) {
                    // Ignore errors for individual file reads
                }
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading config directory:', error);
        }
    }
    return count;
}
