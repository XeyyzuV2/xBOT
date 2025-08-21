import { isOwner } from '../utils.js';

// Simple delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const handler = async ({ conn, m, text }) => {
  if (!isOwner(m.from.id)) {
    return conn.sendMessage(m.chat.id, 'Perintah ini hanya untuk Owner.', {
      reply_to_message_id: m.message_id
    });
  }

  const broadcastMessage = text.trim();
  if (!broadcastMessage) {
    return conn.sendMessage(m.chat.id, 'Silakan masukkan pesan untuk di-broadcast.\nContoh: /broadcast Halo semua!', {
      reply_to_message_id: m.message_id
    });
  }

  const chatIds = Array.from(global.chatIds || []);
  if (chatIds.length === 0) {
    return conn.sendMessage(m.chat.id, 'Tidak ada chat yang terdaftar untuk broadcast.', {
      reply_to_message_id: m.message_id
    });
  }

  await conn.sendMessage(m.chat.id, `📢 Memulai broadcast ke ${chatIds.length} chat...`, {
    reply_to_message_id: m.message_id
  });

  let successCount = 0;
  let failureCount = 0;

  for (const chatId of chatIds) {
    try {
      await conn.sendMessage(chatId, broadcastMessage);
      successCount++;
      await delay(300); // 300ms delay to avoid rate limiting
    } catch (err) {
      console.error(`Gagal mengirim broadcast ke chat ${chatId}:`, err.message);
      failureCount++;
    }
  }

  const reportMessage = `✅ Broadcast selesai.\n\nBerhasil terkirim: ${successCount}\nGagal terkirim: ${failureCount}`;
  await conn.sendMessage(m.chat.id, reportMessage, {
    reply_to_message_id: m.message_id
  });
};

handler.command = ['broadcast', 'bc'];
handler.help = ['broadcast <pesan>'];
handler.tags = ['owner'];
handler.private = true;

export default handler;
