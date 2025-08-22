import { isOwner } from '../utils.js';

const pendingBroadcasts = {}; // { messageId: 'broadcast content' }

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

  const confirmationMessage = `Anda akan mengirim pesan berikut ke ${chatIds.length} chat:\n\n`
    + `"${broadcastMessage}"\n\n`
    + `Apakah Anda yakin?`;

  const keyboard = {
      inline_keyboard: [[
          { text: '✅ Kirim', callback_data: `broadcast:send:${m.message_id}` },
          { text: '❌ Batal', callback_data: `broadcast:cancel:${m.message_id}` }
      ]]
  };

  pendingBroadcasts[m.message_id] = broadcastMessage;

  await conn.sendMessage(m.chat.id, confirmationMessage, {
      reply_to_message_id: m.message_id,
      reply_markup: JSON.stringify(keyboard)
  });
};

export async function handleBroadcastCallback(conn, cb) {
    // Answer immediately
    conn.answerCallbackQuery(cb.id).catch(() => {});

    const [,, action, messageId] = cb.data.split(':');
    const fromId = cb.from.id;

    if (!isOwner(fromId)) {
        return; // No need to answer again
    }

    const originalMessageContent = pendingBroadcasts[messageId];
    if (!originalMessageContent) {
        await conn.editMessageText('Broadcast ini sudah tidak valid atau telah dibatalkan.', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id
        });
        return;
    }

    if (action === 'cancel') {
        delete pendingBroadcasts[messageId];
        await conn.editMessageText('Broadcast dibatalkan.', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id
        });
        return;
    }

    if (action === 'send') {
        delete pendingBroadcasts[messageId]; // Prevent re-sending
        const chatIds = Array.from(global.chatIds || []);
        const total = chatIds.length;
        let successCount = 0;
        let failureCount = 0;
        const startTime = Date.now();

        await conn.editMessageText(`📢 Mengirim broadcast ke ${total} chat... Ini mungkin memakan waktu.`, {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id
        });

        const batchSize = 20;
        const delayBetweenBatches = 1000; // 1 second

        for (let i = 0; i < total; i += batchSize) {
            const batch = chatIds.slice(i, i + batchSize);
            const promises = batch.map(chatId =>
                conn.sendMessage(chatId, originalMessageContent)
                    .then(() => successCount++)
                    .catch(err => {
                        console.error(`Gagal mengirim broadcast ke chat ${chatId}:`, err.message);
                        failureCount++;
                    })
            );
            await Promise.all(promises);
            if (i + batchSize < total) {
                await delay(delayBetweenBatches);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const reportMessage = `✅ Broadcast selesai.\n\nBerhasil: ${successCount}/${total}\nGagal: ${failureCount}\nWaktu: ${duration} detik`;
        await conn.sendMessage(cb.message.chat.id, reportMessage);
    }
}

handler.command = ['broadcast', 'bc'];
handler.help = ['broadcast <pesan>'];
handler.tags = ['owner'];
handler.private = true;

export default handler;
