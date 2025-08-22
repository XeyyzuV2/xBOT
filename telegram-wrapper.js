import Bottleneck from 'bottleneck';

let botInstance = null;

// Create a limiter instance.
// This will ensure 1 operation per 400ms to stay within Telegram's general limits.
const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 400
});

// Configure bottleneck to handle retries on rate limit errors
limiter.on('failed', async (error, jobInfo) => {
    const statusCode = error.response?.statusCode;
    if (statusCode === 429) {
        const retryAfter = error.response.parameters.retry_after;
        console.warn(`Rate limit hit. Retrying after ${retryAfter}s.`);
        return retryAfter * 1000; // Return retry delay in ms
    }
});


/**
 * Initializes the wrapper with the bot instance.
 * @param {object} bot The node-telegram-bot-api instance.
 */
export function init(bot) {
    botInstance = bot;
}

/**
 * A generic function to wrap bot methods with the rate limiter and custom error handling.
 * @param {string} method The name of the bot method to call.
 * @returns {Function} The wrapped function.
 */
function wrapMethod(method) {
    const wrappedFn = async (...args) => {
        if (!botInstance) throw new Error('Telegram Wrapper not initialized.');
        return botInstance[method](...args);
    };

    return limiter.wrap(wrappedFn);
}

/**
 * A special wrapper for methods where certain errors should be ignored.
 * @param {string} method The name of the bot method.
 * @param {string[]} ignoreMessages A list of error message substrings to ignore.
 * @returns {Function} The wrapped function with custom error handling.
 */
function wrapMethodAndIgnoreErrors(method, ignoreMessages = []) {
    const wrappedFn = async (...args) => {
        if (!botInstance) throw new Error('Telegram Wrapper not initialized.');
        try {
            return await botInstance[method](...args);
        } catch (error) {
            // Silently ignore specific, non-critical errors
            if (ignoreMessages.some(msg => error.message.includes(msg))) {
                return null; // Resolve with null
            }
            // For all other errors, re-throw to be handled by bottleneck or the caller
            throw error;
        }
    };

    return limiter.wrap(wrappedFn);
}


// Export the wrapped methods that the bot uses.
export const conn = {
    sendMessage: wrapMethod('sendMessage'),
    editMessageText: wrapMethodAndIgnoreErrors('editMessageText', ['message is not modified']),
    deleteMessage: wrapMethod('deleteMessage'),
    answerCallbackQuery: wrapMethodAndIgnoreErrors('answerCallbackQuery', ['query is too old']),
    sendDocument: wrapMethod('sendDocument'),
    sendPhoto: wrapMethod('sendPhoto'),
    sendVideo: wrapMethod('sendVideo'),
    banChatMember: wrapMethod('banChatMember'),
    unbanChatMember: wrapMethod('unbanChatMember'),
    restrictChatMember: wrapMethod('restrictChatMember'),
    promoteChatMember: wrapMethod('promoteChatMember'),
    pinChatMessage: wrapMethod('pinChatMessage'),
    getChatMember: wrapMethod('getChatMember'),
    getFileStream: wrapMethod('getFileStream'),
    getMe: wrapMethod('getMe'),
};
