import { requireAdmin, requireBotAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  if (!await requireAdmin(conn, m)) return;
  if (!await requireBotAdmin(conn, m, ['can_pin_messages'])) return;

  const chatId = m.chat.id;

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan yang ingin Anda sematkan (pin).', {
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
