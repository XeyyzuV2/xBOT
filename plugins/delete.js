import { requireAdmin, requireBotAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  // requireAdmin will handle the group & admin check and reply automatically.
  if (!await requireAdmin(conn, m)) return;
  // requireBotAdmin will handle the bot permission check and reply automatically.
  if (!await requireBotAdmin(conn, m, ['can_delete_messages'])) return;

  const chatId = m.chat.id;

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan yang ingin Anda hapus.', {
      reply_to_message_id: m.message_id
    });
  }

  try {
    // Delete the target message
    await conn.deleteMessage(chatId, m.reply_to_message.message_id);
    // Delete the command message
    await conn.deleteMessage(chatId, m.message_id);
  } catch (err) {
    console.error('Delete error:', err);
    // It might fail if the message is old, so don't send a failure message to the group.
  }
};

handler.command = ['del', 'delete'];
handler.help = ['del (reply to message)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
