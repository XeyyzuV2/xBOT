import { requireAdmin } from '../utils.js';
import { setGroupConfig, getGroupConfig } from '../config-manager.js';

const handler = async ({ conn, m }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;

  if (!m.reply_to_message || !m.reply_to_message.document) {
    return conn.sendMessage(chatId, 'Balas ke file backup konfigurasi (.json) yang ingin Anda pulihkan.', {
      reply_to_message_id: m.message_id
    });
  }

  const doc = m.reply_to_message.document;
  if (doc.mime_type !== 'application/json') {
    return conn.sendMessage(chatId, 'File harus berformat JSON.', {
      reply_to_message_id: m.message_id
    });
  }

  try {
    const fileStream = conn.getFileStream(doc.file_id);
    let chunks = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    const fileContent = Buffer.concat(chunks).toString('utf-8');
    const newConfig = JSON.parse(fileContent);

    // Basic validation: check if a known root key exists
    const defaultConfig = await getGroupConfig(chatId); // get default structure
    const requiredKeys = Object.keys(defaultConfig);
    const hasRequiredKeys = requiredKeys.every(key => key in newConfig);

    if (!hasRequiredKeys) {
        return conn.sendMessage(chatId, 'File konfigurasi tidak valid atau strukturnya salah.', {
            reply_to_message_id: m.message_id
        });
    }

    await setGroupConfig(chatId, newConfig);

    conn.sendMessage(chatId, '✅ Konfigurasi berhasil dipulihkan dari file backup.', {
      reply_to_message_id: m.message_id
    });

  } catch (err) {
    console.error('Restore config error:', err);
    conn.sendMessage(chatId, `Gagal memulihkan konfigurasi. Pastikan file JSON valid. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['restoreconfig'];
handler.help = ['restoreconfig (reply to backup file)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
