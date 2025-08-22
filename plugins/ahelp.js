import { requireAdmin } from '../utils.js';
import { t } from '../i18n.js';

const handler = async ({ conn, m }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Perintah ini harus digunakan dengan membalas pesan pengguna lain.', {
      reply_to_message_id: m.message_id
    });
  }

  const targetUser = m.reply_to_message.from;
  const text = `🛠 *Admin Help Menu* 🛠\n\nAksi cepat untuk pengguna: ${targetUser.first_name}`;

  const keyboard = [
      [
          { text: 'Mute 10m', callback_data: `mod:mute:${targetUser.id}:10m` },
          { text: 'Mute 1h', callback_data: `mod:mute:${targetUser.id}:1h` },
          { text: 'Mute 1d', callback_data: `mod:mute:${targetUser.id}:1d` }
      ],
      [
          { text: 'Unmute', callback_data: `mod:unmute:${targetUser.id}` },
          { text: 'Kick', callback_data: `mod:kick:${targetUser.id}` }
      ],
      [{ text: '❌ Tutup', callback_data: 'mod:close' }]
  ];

  await conn.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
      reply_to_message_id: m.message_id
  });
};

/**
 * Parses a duration string (e.g., '10m', '1h', '1d') into seconds.
 * @param {string} durationStr The duration string.
 * @returns {number} The duration in seconds.
 */
function parseDuration(durationStr) {
    const unit = durationStr.slice(-1);
    const value = parseInt(durationStr.slice(0, -1));
    if (isNaN(value)) return 0;
    switch (unit) {
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 0;
    }
}

export async function handleModerationCallback(conn, cb) {
    // Answer immediately
    conn.answerCallbackQuery(cb.id).catch(() => {});

    const { data, message } = cb;
    const chatId = message.chat.id;

    if (!await isGroupAdmin(conn, chatId, cb.from.id)) {
        return conn.answerCallbackQuery(cb.id, { text: 'Anda harus menjadi admin untuk melakukan ini.' });
    }

    const [prefix, action, targetId, param] = data.split(':');

    if (prefix !== 'mod') return conn.answerCallbackQuery(cb.id);

    try {
        let confirmationText = '';
        if (action === 'mute') {
            const durationSec = parseDuration(param);
            if (durationSec === 0) throw new Error('Invalid mute duration');
            const until_date = Math.floor(Date.now() / 1000) + durationSec;
            await conn.restrictChatMember(chatId, targetId, { until_date, can_send_messages: false });
            confirmationText = `✅ Pengguna telah di-mute selama ${param}.`;
        } else if (action === 'unmute') {
            await conn.restrictChatMember(chatId, targetId, { can_send_messages: true });
            confirmationText = '✅ Pengguna telah di-unmute.';
        } else if (action === 'kick') {
            await conn.banChatMember(chatId, targetId);
            await conn.unbanChatMember(chatId, targetId); // So they can rejoin
            confirmationText = '✅ Pengguna telah di-kick.';
        } else if (action === 'close') {
            return await conn.deleteMessage(chatId, message.message_id);
        }

        await conn.editMessageText(confirmationText, {
            chat_id: chatId,
            message_id: message.message_id,
            reply_markup: null // Remove buttons
        });

    } catch (err) {
        console.error('Moderation callback error:', err);
        await conn.answerCallbackQuery(cb.id, { text: `Error: ${err.message}`, show_alert: true });
    }
}


handler.command = ['ahelp', 'adminhelp'];
handler.help = ['ahelp (reply to user)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
