import { requireAdmin } from '../utils.js';
import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { t } from '../i18n.js';

const handler = async ({ conn, m, text }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;
  const targetLang = text.trim().toLowerCase();

  if (!['en', 'id'].includes(targetLang)) {
    const currentConfig = await getGroupConfig(chatId);
    return conn.sendMessage(chatId, `Penggunaan: /lang <en|id>\nBahasa saat ini: ${currentConfig.lang}`, {
      reply_to_message_id: m.message_id
    });
  }

  try {
    const config = await getGroupConfig(chatId);
    config.lang = targetLang;
    await setGroupConfig(chatId, config);

    const confirmationMessage = await t(chatId, 'language_changed', { lang: targetLang });
    await conn.sendMessage(chatId, confirmationMessage, {
      reply_to_message_id: m.message_id
    });

  } catch (err) {
    console.error('Set lang error:', err);
    conn.sendMessage(chatId, 'Gagal mengubah bahasa.', {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['lang', 'language'];
handler.help = ['lang <en|id>'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
