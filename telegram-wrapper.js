let botInstance = null;

/**
 * Initializes the wrapper with the bot instance.
 * @param {object} bot The node-telegram-bot-api instance.
 */
export function init(bot) {
    botInstance = bot;
}

/**
 * A generic wrapper for Telegram API calls that handles retries with exponential backoff.
 * @param {string} method The name of the bot method to call (e.g., 'sendMessage').
 * @param {any[]} args The arguments to pass to the method.
 * @returns {Promise<any>} The result of the API call.
 */
async function apiWrapper(method, ...args) {
    if (!botInstance) {
        throw new Error('Telegram Wrapper not initialized. Call init(bot) first.');
    }

    let retries = 5;
    let delay = 1000; // Start with 1 second

    while (retries > 0) {
        try {
            return await botInstance[method](...args);
        } catch (error) {
            const statusCode = error.response?.statusCode;
            if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
                console.warn(`Telegram API error (Status ${statusCode}). Retrying in ${delay / 1000}s... (${retries - 1} retries left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponentially increase delay
                retries--;
            } else {
                // Not a retryable error, re-throw it to be handled by the caller
                throw error;
            }
        }
    }
    // If all retries fail, throw an error
    throw new Error(`Max retries exceeded for method ${method}.`);
}

// Export the wrapped methods that the bot uses.
// We don't need to wrap every single method, just the ones used in the plugins.
export const conn = {
    sendMessage: (...args) => apiWrapper('sendMessage', ...args),
    editMessageText: (...args) => apiWrapper('editMessageText', ...args),
    deleteMessage: (...args) => apiWrapper('deleteMessage', ...args),
    answerCallbackQuery: (...args) => apiWrapper('answerCallbackQuery', ...args),
    sendDocument: (...args) => apiWrapper('sendDocument', ...args),
    sendPhoto: (...args) => apiWrapper('sendPhoto', ...args),
    sendVideo: (...args) => apiWrapper('sendVideo', ...args),
    banChatMember: (...args) => apiWrapper('banChatMember', ...args),
    unbanChatMember: (...args) => apiWrapper('unbanChatMember', ...args),
    restrictChatMember: (...args) => apiWrapper('restrictChatMember', ...args),
    promoteChatMember: (...args) => apiWrapper('promoteChatMember', ...args),
    pinChatMessage: (...args) => apiWrapper('pinChatMessage', ...args),
    getChatMember: (...args) => apiWrapper('getChatMember', ...args),
    getFileStream: (...args) => apiWrapper('getFileStream', ...args),
    getMe: (...args) => apiWrapper('getMe', ...args),
};
