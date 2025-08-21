import { getGroupConfig } from './config-manager.js';
import { t } from './i18n.js';

/**
 * Formats a user object into a mention string.
 * @param {object} user The user object {id, first_name}.
 * @returns {string} An HTML-formatted mention string.
 */
function formatUser(user) {
    if (!user || !user.id || !user.first_name) return 'N/A';
    return `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
}

/**
 * Logs an event to the configured log channel for a specific group.
 * @param {object} conn The bot instance.
 * @param {string|number} chatId The ID of the group where the event occurred.
 * @param {string} eventType The type of event (e.g., 'ban', 'mute', 'spam_flood').
 * @param {object} data The data associated with the event.
 */
export async function logEvent(conn, chatId, eventType, data) {
    const config = await getGroupConfig(chatId);
    const logChannelId = config.log.channelId;

    if (!logChannelId) {
        return; // Logging is disabled for this group.
    }

    let logMessage = `📝 <b>Log Event</b>\n`;
    logMessage += `<b>Group:</b> ${data.chat.title || chatId}\n`;
    logMessage += `<b>Timestamp:</b> ${new Date().toISOString()}\n\n`;

    const admin = data.admin ? formatUser(data.admin) : 'N/A';
    const user = data.user ? formatUser(data.user) : 'N/A';
    const reason = data.reason || 'No reason specified.';

    switch (eventType) {
        case 'ban':
            logMessage += `🚨 <b>User Banned</b>\n`;
            logMessage += `<b>User:</b> ${user}\n`;
            logMessage += `<b>Admin:</b> ${admin}`;
            break;

        case 'mute':
            logMessage += `🤫 <b>User Muted</b>\n`;
            logMessage += `<b>User:</b> ${user}\n`;
            logMessage += `<b>Admin:</b> ${admin}`;
            break;

        case 'unmute':
            logMessage += `🗣️ <b>User Unmuted</b>\n`;
            logMessage += `<b>User:</b> ${user}\n`;
            logMessage += `<b>Admin:</b> ${admin}`;
            break;

        case 'spam_detected':
            logMessage += `🛡️ <b>Spam Detected</b>\n`;
            logMessage += `<b>User:</b> ${user}\n`;
            logMessage += `<b>Action:</b> ${data.action}\n`; // e.g., 'warn', 'mute', 'kick'
            logMessage += `<b>Reason:</b> ${reason}`;
            break;

        case 'verification_failed':
            logMessage += `❓ <b>Verification Failed</b>\n`;
            logMessage += `<b>User:</b> ${user}\n`;
            logMessage += `<b>Action:</b> ${data.action}`;
            break;

        default:
            logMessage += `ℹ️ <b>Event:</b> ${eventType}\n`;
            logMessage += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            break;
    }

    try {
        await conn.sendMessage(logChannelId, logMessage, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`Failed to send log to channel ${logChannelId}:`, error.message);
        // Optional: Notify the group admin that logging is failing.
        // This could be spammy, so we'll just log it to the console for now.
    }
}
