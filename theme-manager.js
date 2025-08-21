const themes = {
    classic: {
        // Logs
        kick: '⚔️',
        mute: '⏱',
        unmute: '🔓',
        spam: '🛡',
        verify_fail: '❌',
        log_test: '✅',
        // Menu
        antispam: '🛡',
        welcome: '👋',
        log: '📜',
        lang: '🌐',
        close: '❌',
    },
    chill: {
        // Logs
        kick: '😎',
        mute: '😴',
        unmute: '😊',
        spam: '👀',
        verify_fail: '🤔',
        log_test: '👍',
        // Menu
        antispam: '😎',
        welcome: '🤙',
        log: '🤙',
        lang: '🤙',
        close: '🤙',
    },
    strict: {
        // Logs
        kick: '🚫',
        mute: '🔇',
        unmute: '✅',
        spam: '🚨',
        verify_fail: '⚠️',
        log_test: '➡️',
        // Menu
        antispam: '📊',
        welcome: '📄',
        log: '📈',
        lang: '🌍',
        close: '✖️',
    }
};

/**
 * Gets an icon for a specific key from a given theme.
 * Falls back to the classic theme if the icon is not found in the specified theme.
 * @param {string} themeName The name of the theme (e.g., 'classic', 'chill').
 * @param {string} iconKey The key for the icon (e.g., 'kick', 'mute').
 * @returns {string} The emoji icon.
 */
export function getIcon(themeName, iconKey) {
    const theme = themes[themeName] || themes.classic;
    return theme[iconKey] || '❓'; // Fallback to a question mark if key doesn't exist at all
}

/**
 * Gets a list of available theme names.
 * @returns {string[]} An array of theme names.
 */
export function getAvailableThemes() {
    return Object.keys(themes);
}
