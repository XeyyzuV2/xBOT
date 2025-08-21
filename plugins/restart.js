import { isOwner } from '../utils.js';

const handler = async ({ conn, m }) => {
  if (!isOwner(m.from.id)) {
    return conn.sendMessage(m.chat.id, 'Perintah ini hanya untuk Owner.', {
      reply_to_message_id: m.message_id
    });
  }

  try {
    await conn.sendMessage(m.chat.id, 'Bot akan di-restart...', {
      reply_to_message_id: m.message_id
    });
    process.exit(0);
  } catch (err) {
    console.error('Restart error:', err);
    conn.sendMessage(m.chat.id, 'Gagal me-restart bot.');
  }
};

handler.command = ['restart'];
handler.help = ['restart'];
handler.tags = ['owner'];
handler.private = true;

export default handler;
