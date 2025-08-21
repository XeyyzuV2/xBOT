import { isOwner, isGroupAdmin, botIsAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  const chatId = m.chat.id;

  if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') {
    return conn.sendMessage(chatId, 'Perintah ini hanya bisa digunakan di dalam grup.', {
      reply_to_message_id: m.message_id
    });
  }

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan admin yang ingin Anda turunkan jabatannya.', {
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
  if (!botAdminData || !botAdminData.can_promote_members) {
    return conn.sendMessage(chatId, 'Saya tidak memiliki izin untuk mengubah jabatan anggota di grup ini.', {
      reply_to_message_id: m.message_id
    });
  }

  if (isOwner(targetId)) {
    return conn.sendMessage(chatId, 'Tidak bisa menurunkan jabatan Owner Bot.', {
        reply_to_message_id: m.message_id
    });
  }

  try {
    await conn.promoteChatMember(chatId, targetId, {
      can_change_info: false,
      can_delete_messages: false,
      can_invite_users: false,
      can_restrict_members: false,
      can_pin_messages: false,
      can_promote_members: false,
    });
    conn.sendMessage(chatId, `✅ Jabatan admin untuk pengguna ${targetUsername} telah dicabut.`, {
      reply_to_message_id: m.message_id
    });
  } catch (err) {
    console.error('Demote error:', err);
    conn.sendMessage(chatId, `Gagal menurunkan jabatan pengguna. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['demote'];
handler.help = ['demote (reply to user)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
