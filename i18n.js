import fs from 'fs/promises';
import path from 'path';
import { getGroupConfig } from './config-manager.js';

const locales = {};
const localesDir = path.join(process.cwd(), 'locales');

/**
 * Loads a locale file from disk and caches it.
 * @param {string} lang - The language code (e.g., 'en', 'id').
 */
async function loadLocale(lang) {
  if (locales[lang]) {
    return; // Already cached
  }
  try {
    const filePath = path.join(localesDir, `${lang}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    locales[lang] = JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load locale '${lang}':`, error);
    // Fallback to English if a locale fails to load
    if (lang !== 'en' && !locales['en']) {
        await loadLocale('en');
    }
  }
}

// Pre-load default locales on startup
Promise.all([loadLocale('en'), loadLocale('id')]).catch(console.error);

/**
 * Gets a translated string for a given key.
 * @param {string|number} chatId - The chat ID to get the language setting for.
 * @param {string} key - The key of the string to translate (e.g., 'errors.admin_only').
 * @param {object} [params={}] - An object with placeholder values to replace.
 * @returns {Promise<string>} The translated and formatted string.
 */
export async function t(chatId, key, params = {}) {
  const config = await getGroupConfig(chatId);
  const lang = config.lang || 'id';

  const langData = locales[lang] || locales['id']; // Fallback to id if lang not found

  const keyParts = key.split('.');
  let translation = langData;
  for (const part of keyParts) {
    translation = translation?.[part];
  }

  if (typeof translation !== 'string') {
    console.warn(`Translation not found for key: ${key} in lang: ${lang}`);
    return key; // Return the key itself as a fallback
  }

  // Replace placeholders
  return Object.entries(params).reduce((acc, [pKey, pValue]) => {
    return acc.replace(new RegExp(`{${pKey}}`, 'g'), pValue);
  }, translation);
}
