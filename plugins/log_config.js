import { requireAdmin } from '../utils.js';
import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { t } from '../i18n.js';

const handler = async ({ conn, m, text }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;
  const arg = text.trim().toLowerCase();

  let config = await getGroupConfig(chatId);

  if (!arg) {
    const status = config.log.channelId ? `Aktif (${config.log.channelId})` : 'Nonaktif';
    const statusMessage = await t(chatId, 'log_config.status_header', { status });
    const usageMessage = await t(chatId, 'log_config.usage');
    return conn.sendMessage(chatId, `${statusMessage}\n\n${usageMessage}`, { reply_to_message_id: m.message_id });
  }

  if (arg === 'off') {
    config.log.channelId = null;
    await setGroupConfig(chatId, config);
    return conn.sendMessage(chatId, await t(chatId, 'log_config.disabled'), { reply_to_message_id: m.message_id });
  }

  const newLogChannelId = parseInt(arg);
  if (isNaN(newLogChannelId)) {
    return conn.sendMessage(chatId, await t(chatId, 'log_config.invalid_id'), { reply_to_message_id: m.message_id });
  }

  try {
    const testMessage = await t(chatId, 'log_config.test_message', { groupTitle: m.chat.title });
    await conn.sendMessage(newLogChannelId, testMessage);

    config.log.channelId = newLogChannelId;
    await setGroupConfig(chatId, config);

    await conn.sendMessage(chatId, await t(chatId, 'log_config.set_success', { channelId: newLogChannelId }), { reply_to_message_id: m.message_id });

  } catch (err) {
    console.error('Set log channel error:', err);
    const failMessage = await t(chatId, 'log_config.set_fail', { error: err.message });
    await conn.sendMessage(chatId, failMessage, { reply_to_message_id: m.message_id });
  }
};

handler.command = ['setlog'];
handler.help = ['setlog <channel_id|off>'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
