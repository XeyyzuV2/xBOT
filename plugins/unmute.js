import { isOwner, isGroupAdmin, botIsAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  const chatId = m.chat.id;

  if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') {
    return conn.sendMessage(chatId, 'Perintah ini hanya bisa digunakan di dalam grup.', {
      reply_to_message_id: m.message_id
    });
  }

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan pengguna yang ingin Anda aktifkan kembali (unmute).', {
      reply_to_message_id: m.message_id
    });
  }

  const senderId = m.from.id;
  const targetId = m.reply_to_message.from.id;
  const targetUsername = m.reply_to_message.from.first_name;

  const senderIsAdmin = await isGroupAdmin(conn, chatId, senderId);
  if (!senderIsAdmin) {
    return conn.sendMessage(chatId, 'Hanya admin yang bisa menggunakan perintah ini.', {
      reply_to_message_id: m.message_id
    });
  }

  const botAdminData = await botIsAdmin(conn, chatId);
  if (!botAdminData || !botAdminData.can_restrict_members) {
    return conn.sendMessage(chatId, 'Saya tidak memiliki izin untuk mengubah izin anggota di grup ini.', {
      reply_to_message_id: m.message_id
    });
  }

  try {
    // Restore default permissions for the user.
    await conn.restrictChatMember(chatId, targetId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });

    conn.sendMessage(chatId, `✅ Pengguna ${targetUsername} telah di-unmute. Mereka sekarang bisa mengirim pesan lagi.`, {
      reply_to_message_id: m.message_id
    });
  } catch (err) {
    console.error('Unmute error:', err);
    conn.sendMessage(chatId, `Gagal meng-unmute pengguna. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['unmute'];
handler.help = ['unmute (reply to user)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
