import { isGroupAdmin, botIsAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  const chatId = m.chat.id;

  if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') {
    return conn.sendMessage(chatId, 'Perintah ini hanya bisa digunakan di dalam grup.', {
      reply_to_message_id: m.message_id
    });
  }

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan yang ingin Anda sematkan (pin).', {
      reply_to_message_id: m.message_id
    });
  }

  const senderIsAdmin = await isGroupAdmin(conn, chatId, m.from.id);
  if (!senderIsAdmin) {
    return conn.sendMessage(chatId, 'Hanya admin yang bisa menggunakan perintah ini.', {
      reply_to_message_id: m.message_id
    });
  }

  const botAdminData = await botIsAdmin(conn, chatId);
  if (!botAdminData || !botAdminData.can_pin_messages) {
    return conn.sendMessage(chatId, 'Saya tidak memiliki izin untuk menyematkan pesan di grup ini.', {
      reply_to_message_id: m.message_id
    });
  }

  try {
    await conn.pinChatMessage(chatId, m.reply_to_message.message_id, {
      disable_notification: false,
    });
    // Telegram automatically sends a "message pinned" notification, so a custom one isn't strictly needed.
    // We can send a confirmation reply if we want.
    await conn.sendMessage(chatId, '✅ Pesan telah disematkan.', {
        reply_to_message_id: m.message_id
    });
  } catch (err) {
    console.error('Pin error:', err);
    conn.sendMessage(chatId, `Gagal menyematkan pesan. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['pin'];
handler.help = ['pin (reply to message)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
