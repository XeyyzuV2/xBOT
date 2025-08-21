import { requireAdmin } from '../utils.js';
import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { logEvent } from '../logger.js';
import { t } from '../i18n.js';

// State to track users who are expected to forward a message
global.waitingForForward = global.waitingForForward || {}; // { userId: chatId }

const handler = async ({ conn, m, command }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;
  const userId = m.from.id;

  if (command === 'setlog') {
    global.waitingForForward[userId] = chatId;
    await conn.sendMessage(chatId, 'Untuk mengatur channel log, forward satu pesan dari channel tujuan ke sini. Pesan bisa apa saja.', {
      reply_to_message_id: m.message_id
    });
    // Set a timeout to clear the waiting state
    setTimeout(() => {
        if (global.waitingForForward[userId] === chatId) {
            delete global.waitingForForward[userId];
        }
    }, 60 * 1000); // 1 minute timeout

  } else if (command === 'log') {
    const arg = m.text.split(' ')[1]?.toLowerCase();
    if (arg === 'off') {
        let config = await getGroupConfig(chatId);
        config.log.channelId = null;
        await setGroupConfig(chatId, config);
        return conn.sendMessage(chatId, await t(chatId, 'log_config.disabled'), { reply_to_message_id: m.message_id });
    }
    if (arg === 'test') {
        await conn.sendMessage(chatId, 'Mengirim 3 log tes ke channel log...', { reply_to_message_id: m.message_id });
        await logEvent(conn, chatId, 'test', { chat: m.chat });
        await logEvent(conn, chatId, 'ban', { chat: m.chat, admin: m.from, user: { id: 12345, first_name: 'TestUser' } });
        await logEvent(conn, chatId, 'spam_detected', { chat: m.chat, user: m.from, action: 'warn', reason: 'flood' });
        return;
    }
    // Default /log command shows status
    const config = await getGroupConfig(chatId);
    const status = config.log.channelId ? `Aktif (${config.log.channelId})` : 'Nonaktif';
    const statusMessage = await t(chatId, 'log_config.status_header', { status });
    return conn.sendMessage(chatId, `${statusMessage}`, { reply_to_message_id: m.message_id });
  }
};

export async function handleLogChannelSetup(conn, msg) {
    const userId = msg.from.id;
    const originalChatId = global.waitingForForward[userId];

    if (!originalChatId || !msg.forward_from_chat) {
        return false; // Not a log setup message
    }

    // Check if the user is an admin in the original group
    const isAdmin = await requireAdmin(conn, { ...msg, chat: { id: originalChatId }, from: msg.from });
    if(!isAdmin) {
        delete global.waitingForForward[userId];
        return false;
    }

    const newLogChannel = msg.forward_from_chat;
    let config = await getGroupConfig(originalChatId);

    try {
        const testMessage = await t(originalChatId, 'log_config.test_message', { groupTitle: newLogChannel.title });
        await conn.sendMessage(newLogChannel.id, testMessage);

        config.log.channelId = newLogChannel.id;
        await setGroupConfig(originalChatId, config);

        const successMessage = await t(originalChatId, 'log_config.set_success', { channelId: newLogChannel.id });
        await conn.sendMessage(originalChatId, successMessage);
    } catch (err) {
        console.error('Set log channel error:', err);
        const failMessage = await t(originalChatId, 'log_config.set_fail', { error: err.message });
        await conn.sendMessage(originalChatId, failMessage);
    } finally {
        delete global.waitingForForward[userId];
    }
    return true; // Message was handled
}


handler.command = ['setlog', 'log'];
handler.help = ['setlog', 'log <off|test>'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
