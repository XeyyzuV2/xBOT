import { requireAdmin } from '../utils.js';
import { getGroupConfig } from '../config-manager.js';

const handler = async ({ conn, m }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;

  try {
    const config = await getGroupConfig(chatId);
    const configJson = JSON.stringify(config, null, 2);
    const buffer = Buffer.from(configJson, 'utf-8');

    await conn.sendDocument(chatId, buffer, {
      caption: `Berikut adalah backup konfigurasi untuk grup ini. Simpan file ini untuk me-restore kapan saja.`,
      reply_to_message_id: m.message_id
    }, {
      filename: `xbot_config_backup_${chatId}.json`,
      contentType: 'application/json'
    });

  } catch (err) {
    console.error('Backup config error:', err);
    conn.sendMessage(chatId, 'Gagal membuat backup konfigurasi.', {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['backupconfig'];
handler.help = ['backupconfig'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
