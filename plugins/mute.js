import { isOwner, isGroupAdmin, botIsAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  const chatId = m.chat.id;

  if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') {
    return conn.sendMessage(chatId, 'Perintah ini hanya bisa digunakan di dalam grup.', {
      reply_to_message_id: m.message_id
    });
  }

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan pengguna yang ingin Anda bisukan (mute).', {
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
    return conn.sendMessage(chatId, 'Saya tidak memiliki izin untuk membisukan anggota di grup ini.', {
      reply_to_message_id: m.message_id
    });
  }

  if (isOwner(targetId)) {
    return conn.sendMessage(chatId, 'Tidak bisa membisukan Owner Bot.', {
        reply_to_message_id: m.message_id
    });
  }
  const targetIsAdmin = await isGroupAdmin(conn, chatId, targetId);
  if (targetIsAdmin) {
    return conn.sendMessage(chatId, 'Tidak bisa membisukan sesama admin.', {
        reply_to_message_id: m.message_id
    });
  }

  try {
    // Restrict the user from sending messages.
    await conn.restrictChatMember(chatId, targetId, {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
    });

    // Also, create an unmute command.
    const unmuteCommand = `/unmute`;

    conn.sendMessage(chatId, `✅ Pengguna ${targetUsername} telah dibisukan. Mereka tidak bisa mengirim pesan sampai di-unmute.`, {
      reply_to_message_id: m.message_id
    });
  } catch (err) {
    console.error('Mute error:', err);
    conn.sendMessage(chatId, `Gagal membisukan pengguna. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['mute'];
handler.help = ['mute (reply to user)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
