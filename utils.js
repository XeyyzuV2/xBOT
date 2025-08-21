import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import config from './config.js';
import { t } from './i18n.js';

/**
 * Sends a media file to a Telegram chat. It automatically determines the type of media (photo, video, or document) based on the file extension.
 * @param {object} conn - The Telegram bot instance.
 * @param {number|string} chatId - The ID of the chat to send the media to.
 * @param {string} filePath - The local path to the file.
 * @param {string} [caption=''] - The caption for the media.
 * @returns {Promise<object>} The sent message object.
 */
export async function sendMedia(conn, chatId, filePath, caption = '') {
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const opts = { caption };

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return conn.sendPhoto(chatId, buffer, opts);
    } else if (['.mp4', '.mov', '.mkv', '.webm'].includes(ext)) {
      return conn.sendVideo(chatId, buffer, opts);
    } else {
      return conn.sendDocument(chatId, buffer, opts);
    }
  } catch (err) {
    console.error(chalk.red.bold('❌ sendMedia error:'), chalk.gray(err));
    // Also inform the user in the chat
    return conn.sendMessage(chatId, '❌ Gagal mengirim file media.');
  }
}

/**
 * Manages a "loading" message in a chat, showing an indicator while a process is running and updating it to "done" when finished.
 * @param {object} m - The message object that triggered the action.
 * @param {object} conn - The Telegram bot instance.
 * @param {boolean} [done=false] - Set to true to change the message to "Selesai" and clear the state.
 */
export async function loading(m, conn, done = false) {
  const chatId = m.chat?.id || m.chat;
  if (!chatId) {
    console.error(chalk.red.bold('❌ loading() error:'), 'chatId is missing.');
    return;
  }

  const key = `loading_${chatId}_${m.message_id || m.id}`;
  global._loadingMsgs = global._loadingMsgs || {};

  try {
    if (!done) {
      const res = await conn.sendMessage(chatId, '⏳ Loading...', { reply_to_message_id: m.message_id || m.id });
      global._loadingMsgs[key] = res.message_id;
    } else {
      const messageId = global._loadingMsgs[key];
      if (messageId) {
        await conn.editMessageText('✅ Selesai diproses.', { chat_id: chatId, message_id: messageId });
        delete global._loadingMsgs[key];
      }
    }
  } catch (err) {
    // Avoid crashing on minor UI errors, like trying to edit a deleted message
    console.error(chalk.red.bold('❌ loading() error:'), chalk.gray(err.message));
  }
}

/**
 * Checks if a user is an owner of the bot.
 * @param {number} userId - The user's Telegram ID.
 * @returns {boolean} True if the user is an owner.
 */
export function isOwner(userId) {
  return config.owner.includes(userId);
}

/**
 * Checks if a user is an admin or creator in a specific group chat.
 * @param {object} conn - The Telegram bot instance.
 * @param {string|number} chatId - The ID of the chat.
 * @param {number} userId - The ID of the user to check.
 * @returns {Promise<boolean>} True if the user is an admin or creator.
 */
export async function isGroupAdmin(conn, chatId, userId) {
  try {
    const member = await conn.getChatMember(chatId, userId);
    return ['administrator', 'creator'].includes(member.status);
  } catch (error) {
    console.error(chalk.red.bold('❌ isGroupAdmin error:'), chalk.gray(error.message));
    return false;
  }
}

/**
 * Checks if the bot itself is an admin in a specific group chat.
 * @param {object} conn - The Telegram bot instance.
 * @param {string|number} chatId - The ID of the chat.
 * @returns {Promise<object|null>} The chat member object for the bot if it's an admin, otherwise null.
 */
export async function botIsAdmin(conn, chatId) {
  try {
    const botInfo = await conn.getMe();
    const member = await conn.getChatMember(chatId, botInfo.id);
    if (['administrator', 'creator'].includes(member.status)) {
      return member; // Return the member object which includes permissions
    }
    return null;
  } catch (error) {
    console.error(chalk.red.bold('❌ botIsAdmin error:'), chalk.gray(error.message));
    return null;
  }
}

/**
 * A guard function that checks if the message sender is a group admin.
 * If not, it replies with an error message and returns false.
 * @param {object} conn - The Telegram bot instance.
 * @param {object} m - The message object.
 * @returns {Promise<boolean>} True if the sender is an admin, false otherwise.
 */
export async function requireAdmin(conn, m) {
    const chatId = m.chat.id;
    const senderId = m.from.id;

    if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') {
        await conn.sendMessage(chatId, await t(chatId, 'errors.must_be_group'), { reply_to_message_id: m.message_id });
        return false;
    }

    const isAdmin = await isGroupAdmin(conn, chatId, senderId);
    if (!isAdmin) {
        await conn.sendMessage(chatId, await t(chatId, 'errors.admin_only'), { reply_to_message_id: m.message_id });
        return false;
    }
    return true;
}

/**
 * Formats bytes into a human-readable string (e.g., 1024 -> "1 KB").
 * @param {number} bytes The number of bytes.
 * @returns {string} The formatted string.
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats seconds into a human-readable uptime string (e.g., "1d 02h 30m 05s").
 * @param {number} seconds The total seconds.
 * @returns {string} The formatted uptime string.
 */
export function formatUptime(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= (24 * 3600);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
}

/**
 * A guard function that checks if the group has an active premium status.
 * If not, it replies with an error message and returns false.
 * @param {object} conn - The Telegram bot instance.
 * @param {object} m - The message object.
 * @returns {Promise<boolean>} True if the group is premium, false otherwise.
 */
export async function requirePremium(conn, m) {
    const chatId = m.chat.id;
    const config = await getGroupConfig(chatId);

    if (!config.premiumUntil || config.premiumUntil <= Date.now()) {
        const message = await t(chatId, 'premium.feature_locked');
        await conn.sendMessage(chatId, message, { reply_to_message_id: m.message_id });
        return false;
    }
    return true;
}

/**
 * A guard function that checks if the bot has the required permissions in a group.
 * If not, it replies with an error message and returns false.
 * @param {object} conn - The Telegram bot instance.
 * @param {object} m - The message object.
 * @param {string[]} perms - An array of required permission keys (e.g., 'can_restrict_members').
 * @returns {Promise<boolean>} True if the bot has all required permissions, false otherwise.
 */
export async function requireBotAdmin(conn, m, perms = []) {
    const chatId = m.chat.id;
    const botMember = await botIsAdmin(conn, chatId);

    if (!botMember) {
        await conn.sendMessage(chatId, await t(chatId, 'errors.bot_must_be_admin'), { reply_to_message_id: m.message_id });
        return false;
    }

    const missingPerms = perms.filter(p => !botMember[p]);
    if (missingPerms.length > 0) {
        const message = await t(chatId, 'errors.bot_missing_perms', { missingPerms: missingPerms.join(', ') });
        await conn.sendMessage(chatId, message, { reply_to_message_id: m.message_id });
        return false;
    }

    return true;
}
