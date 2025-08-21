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
    const [,, action, messageId] = cb.data.split(':');
    const fromId = cb.from.id;

    if (!isOwner(fromId)) {
        return conn.answerCallbackQuery(cb.id, { text: 'Anda tidak diizinkan melakukan ini.' });
    }

    const originalMessageContent = pendingBroadcasts[messageId];
    if (!originalMessageContent) {
        await conn.editMessageText('Broadcast ini sudah tidak valid atau telah dibatalkan.', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id
        });
        return conn.answerCallbackQuery(cb.id);
    }

    if (action === 'cancel') {
        delete pendingBroadcasts[messageId];
        await conn.editMessageText('Broadcast dibatalkan.', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id
        });
        return conn.answerCallbackQuery(cb.id);
    }

    if (action === 'send') {
        const chatIds = Array.from(global.chatIds || []);
        let successCount = 0;
        let failureCount = 0;

        await conn.editMessageText(`📢 Mengirim broadcast ke ${chatIds.length} chat...`, {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id
        });

        for (const chatId of chatIds) {
            try {
                await conn.sendMessage(chatId, originalMessageContent);
                successCount++;
                await delay(300);
            } catch (err) {
                console.error(`Gagal mengirim broadcast ke chat ${chatId}:`, err.message);
                failureCount++;
            }
        }

        const reportMessage = `✅ Broadcast selesai.\n\nBerhasil terkirim: ${successCount}\nGagal terkirim: ${failureCount}`;
        await conn.sendMessage(cb.message.chat.id, reportMessage);

        delete pendingBroadcasts[messageId];
        return conn.answerCallbackQuery(cb.id);
    }
}

handler.command = ['broadcast', 'bc'];
handler.help = ['broadcast <pesan>'];
handler.tags = ['owner'];
handler.private = true;

export default handler;
