import { isGroupAdmin, botIsAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  const chatId = m.chat.id;

  if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') {
    // Silently ignore in private chats
    return;
  }

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan yang ingin Anda hapus.', {
      reply_to_message_id: m.message_id
    });
  }

  const senderIsAdmin = await isGroupAdmin(conn, chatId, m.from.id);
  if (!senderIsAdmin) {
    // To avoid clutter, don't send a message if a non-admin tries to use it.
    // Just delete their /del command.
    try {
        await conn.deleteMessage(chatId, m.message_id);
    } catch (e) {
        console.error("Couldn't delete non-admin's /del command:", e.message);
    }
    return;
  }

  const botAdminData = await botIsAdmin(conn, chatId);
  if (!botAdminData || !botAdminData.can_delete_messages) {
    return conn.sendMessage(chatId, 'Saya tidak memiliki izin untuk menghapus pesan di grup ini.', {
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
