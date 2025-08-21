import { isOwner, isGroupAdmin, botIsAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  const chatId = m.chat.id;

  // 1. Check if it's a group chat
  if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') {
    return conn.sendMessage(chatId, 'Perintah ini hanya bisa digunakan di dalam grup.', {
      reply_to_message_id: m.message_id
    });
  }

  // 2. Check if the command is a reply
  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan pengguna yang ingin Anda ban.', {
      reply_to_message_id: m.message_id
    });
  }

  const senderId = m.from.id;
  const targetId = m.reply_to_message.from.id;
  const targetUsername = m.reply_to_message.from.first_name;

  // 3. Check if sender is an admin
  const senderIsAdmin = await isGroupAdmin(conn, chatId, senderId);
  if (!senderIsAdmin) {
    return conn.sendMessage(chatId, 'Hanya admin yang bisa menggunakan perintah ini.', {
      reply_to_message_id: m.message_id
    });
  }

  // 4. Check if bot is an admin and has ban permissions
  const botAdminData = await botIsAdmin(conn, chatId);
  if (!botAdminData || !botAdminData.can_restrict_members) {
    return conn.sendMessage(chatId, 'Saya tidak memiliki izin untuk memblokir anggota di grup ini.', {
      reply_to_message_id: m.message_id
    });
  }

  // 5. Prevent banning the owner or another admin
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
    conn.sendMessage(chatId, `✅ Pengguna ${targetUsername} telah berhasil diblokir dari grup.`, {
      reply_to_message_id: m.message_id
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
