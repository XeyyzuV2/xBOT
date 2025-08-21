import { getGroupConfig } from './config-manager.js';
import { getIcon } from './theme-manager.js';
import fs from 'fs/promises';
import path from 'path';
import moment from 'moment-timezone';

const incidentsLogPath = path.join(process.cwd(), 'data', 'incidents.log');

/**
 * Formats a user object into an HTML mention string.
 * @param {object} user The user object {id, first_name}.
 * @returns {string} An HTML-formatted mention string.
 */
function formatUser(user) {
    if (!user || !user.id || !user.first_name) return 'N/A';
    // Basic escaping for user names to prevent HTML injection
    const name = user.first_name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<a href="tg://user?id=${user.id}">${name}</a>`;
}

/**
 * Saves a summary of an incident to a local log file.
 * @param {object} incidentData The structured data of the incident.
 */
async function saveIncident(incidentData) {
    try {
        const logLine = JSON.stringify(incidentData) + '\n';
        await fs.appendFile(incidentsLogPath, logLine);
    } catch (error) {
        console.error('Failed to save incident to log file:', error);
    }
}

/**
 * Logs an event to the configured log channel for a specific group.
 * @param {object} conn The bot instance.
 * @param {string|number} chatId The ID of the group where the event occurred.
 * @param {string} eventType The type of event (e.g., 'ban', 'mute', 'spam_detected').
 * @param {object} data The data associated with the event.
 */
export async function logEvent(conn, chatId, eventType, data) {
    // First, save the incident to local storage
    const incident = { type: eventType, user: data.user, admin: data.admin, meta: data, timestamp: new Date().toISOString() };
    await saveIncident(incident);

    // Then, send the rich log to the channel if configured
    const config = await getGroupConfig(chatId);
    const logChannelId = config.log.channelId;

    if (!logChannelId) {
        return; // Logging is disabled for this group.
    }

    const ts = moment().tz('Asia/Jakarta').format('HH:mm:ss');
    const admin = data.admin ? formatUser(data.admin) : 'System';
    const user = data.user ? formatUser(data.user) : 'N/A';
    const theme = config.theme || 'classic';
    let logMessage = '';

    switch (eventType) {
        case 'ban':
        case 'kick':
            logMessage = `${getIcon(theme, 'kick')} KICK | ${user} oleh ${admin} • ${ts}`;
            break;

        case 'mute':
            const duration = data.duration || '';
            logMessage = `${getIcon(theme, 'mute')} MUTE ${duration} | ${user} oleh ${admin} • ${ts}`;
            break;

        case 'unmute':
            logMessage = `${getIcon(theme, 'unmute')} UNMUTE | ${user} oleh ${admin} • ${ts}`;
            break;

        case 'spam_detected':
            const excerpt = data.message_text ? `'${data.message_text.substring(0, 20)}...'` : '';
            logMessage = `${getIcon(theme, 'spam')} SPAM[${data.reason}] → ${data.action.toUpperCase()} | ${user} • ${excerpt} • ${ts}`;
            break;

        case 'verification_failed':
            logMessage = `${getIcon(theme, 'verify_fail')} VERIFY FAIL | ${user} • timeout • ${ts}`;
            break;

        case 'test':
            logMessage = `${getIcon(theme, 'log_test')} LOG TEST | Log dari grup ${data.chat.title} berfungsi • ${ts}`;
            break;

        default:
            // For other events, we might not send a log or use a generic format.
            // For now, we'll skip logging unknown event types to the channel.
            return;
    }

    try {
        await conn.sendMessage(logChannelId, logMessage, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`Failed to send log to channel ${logChannelId}:`, error.message);
    }
}
