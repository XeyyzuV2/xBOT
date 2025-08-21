import { isOwner, isGroupAdmin, requireAdmin, requireBotAdmin } from '../utils.js';
import { t } from '../i18n.js';
import { logEvent } from '../logger.js';
const handler = async ({ conn, m }) => {
  if (!await requireAdmin(conn, m)) return;
  if (!await requireBotAdmin(conn, m, ['can_restrict_members'])) return;

  const chatId = m.chat.id;

  if (!m.reply_to_message) {
    const message = await t(chatId, 'general.reply_to_user_to_ban');
    return conn.sendMessage(chatId, message, {
      reply_to_message_id: m.message_id
    });
  }

  const targetId = m.reply_to_message.from.id;
  const targetUsername = m.reply_to_message.from.first_name;

  if (isOwner(targetId)) {
    return conn.sendMessage(chatId, 'Tidak bisa memblokir Owner Bot.', {
        reply_to_message_id: m.message_id
    });
  }
  const targetIsAdmin = await isGroupAdmin(conn, chatId, targetId);
  if (targetIsAdmin) {
    return conn.sendMessage(chatId, 'Tidak bisa memblokir sesama admin.', {
        reply_to_message_id: m.message_id
    });
  }

  // 6. Ban the user
  try {
    await conn.banChatMember(chatId, targetId);
    await conn.sendMessage(chatId, `✅ Pengguna ${targetUsername} telah berhasil diblokir dari grup.`, {
      reply_to_message_id: m.message_id
    });
    // Log the event
    await logEvent(conn, chatId, 'ban', {
        chat: m.chat,
        admin: m.from,
        user: m.reply_to_message.from,
    });
  } catch (err) {
    console.error('Ban error:', err);
    conn.sendMessage(chatId, `Gagal memblokir pengguna. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['ban', 'kick'];
handler.help = ['ban/kick (reply to user)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
