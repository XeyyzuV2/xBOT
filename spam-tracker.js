// In-memory storage for spam tracking.
// In a real-world, multi-process scenario, this should be replaced with a proper database like Redis.
const userRecords = {};
// { chatId: { userId: { timestamps: [ts1, ts2, ...], lastMessageHash: '...', repeatCount: 0 } } }

const SPAM_CLEANUP_INTERVAL = 60 * 1000; // 1 minute

/**
 * Creates a simple hash from a string.
 * @param {string} str The string to hash.
 * @returns {string} A simple hash.
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}


/**
 * Records a message from a user in a specific chat.
 * @param {string|number} chatId The chat ID.
 * @param {string|number} userId The user ID.
 * @param {string} messageText The content of the message.
 */
export function recordMessage(chatId, userId, messageText) {
    const now = Date.now();

    // Ensure records path exists
    if (!userRecords[chatId]) {
        userRecords[chatId] = {};
    }
    if (!userRecords[chatId][userId]) {
        userRecords[chatId][userId] = {
            timestamps: [],
            lastMessageHash: '',
            repeatCount: 0,
            warnings: 0,
        };
    }

    const user = userRecords[chatId][userId];

    // Record timestamp for flood check
    user.timestamps.push(now);

    // Record for repetition check
    const messageHash = simpleHash(messageText);
    if (user.lastMessageHash === messageHash) {
        user.repeatCount++;
    } else {
        user.lastMessageHash = messageHash;
        user.repeatCount = 1;
    }
}

/**
 * Checks a user's messages for potential spam violations.
 * @param {string|number} chatId The chat ID.
 * @param {string|number} userId The user ID.
 *  * @param {string} messageText The content of the message.
 * @param {object} antiSpamConfig The anti-spam configuration for the group.
 * @param {boolean} isPremium Whether the group has premium status.
 * @returns { {type: string, reason: string} | null } A spam violation object or null.
 */
export function checkSpam(chatId, userId, messageText, antiSpamConfig, isPremium) {
    const now = Date.now();
    const user = userRecords[chatId]?.[userId];

    if (!user) {
        return null; // No record, no spam
    }

    // 1. Flood check
    const floodConfig = antiSpamConfig.flood;
    const floodWindowMs = floodConfig.windowSec * 1000;
    user.timestamps = user.timestamps.filter(ts => now - ts < floodWindowMs);
    if (user.timestamps.length >= floodConfig.count) {
        // To prevent instant re-triggering, clear timestamps after detection
        user.timestamps = [];
        return { type: 'flood', reason: `More than ${floodConfig.count} messages in ${floodConfig.windowSec}s` };
    }

    // --- Premium Features ---
    if (isPremium) {
        // 2. Repetition check
        if (user.repeatCount >= 3) {
            user.repeatCount = 0; // Reset after detection
            return { type: 'repeat', reason: `Same message sent 3+ times` };
        }

        // 3. Caps abuse check (for messages longer than 20 chars)
        if (messageText.length > 20) {
            const caps = (messageText.match(/[A-Z]/g) || []).length;
            const percentage = (caps / messageText.length) * 100;
            if (percentage > 80) {
                return { type: 'caps', reason: `Message contains >80% capital letters` };
            }
        }

        // 4. Link spam check
        const hasUrl = /https?:\/\/[^\s]+/.test(messageText);
        if (hasUrl) {
            const whitelist = antiSpamConfig.linkWhitelist || [];
            const isWhitelisted = whitelist.some(domain => messageText.includes(domain));
            if (!isWhitelisted) {
                return { type: 'link', reason: `Message contains a non-whitelisted link` };
            }
        }
    }

    return null;
}

/**
 * Records a warning for a user and returns the new warning count.
 * @param {string|number} chatId The chat ID.
 * @param {string|number} userId The user ID.
 * @returns {number} The new total warning count for the user.
 */
export function recordWarning(chatId, userId) {
    const user = userRecords[chatId]?.[userId];
    if (!user) {
        // This should not happen if recordMessage is called first.
        // If it does, we can't properly record a warning.
        return 0;
    }
    user.warnings = (user.warnings || 0) + 1;
    return user.warnings;
}

// Periodically clean up old records to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const chatId in userRecords) {
        for (const userId in userRecords[chatId]) {
            const user = userRecords[chatId][userId];
            // Clean timestamps older than 5 minutes
            user.timestamps = user.timestamps.filter(ts => now - ts < 300000);
            if (user.timestamps.length === 0) {
                // If no recent activity, clear the record
                delete userRecords[chatId][userId];
            }
        }
        if (Object.keys(userRecords[chatId]).length === 0) {
            delete userRecords[chatId];
        }
    }
}, SPAM_CLEANUP_INTERVAL);
