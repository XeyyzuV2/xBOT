import { requireAdmin } from '../utils.js';
import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { t } from '../i18n.js';

const handler = async ({ conn, m, text, command }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;
  const args = text.trim().split(' ');
  const action = args[0]?.toLowerCase();

  let config = await getGroupConfig(chatId);

  if (command === 'welcome') {
    switch (action) {
      case 'on':
        config.welcome.enabled = true;
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'welcome.enabled'), { reply_to_message_id: m.message_id });
        break;
      case 'off':
        config.welcome.enabled = false;
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'welcome.disabled'), { reply_to_message_id: m.message_id });
        break;
      case 'set':
        const welcomeText = args.slice(1).join(' ');
        if (!welcomeText) {
          return conn.sendMessage(chatId, await t(chatId, 'welcome.set_usage'), { reply_to_message_id: m.message_id });
        }
        config.welcome.message = welcomeText;
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'welcome.set_success', { text: welcomeText }), { reply_to_message_id: m.message_id });
        break;
      default:
        const status = config.welcome.enabled ? 'Aktif' : 'Nonaktif';
        const helpText = [
            await t(chatId, 'welcome.status_header'),
            await t(chatId, 'antispam.status_current', { status }), // Re-use status string from antispam
            await t(chatId, 'welcome.status_message', { message: config.welcome.message }),
            `\n${await t(chatId, 'welcome.set_usage')}`
        ].join('\n');
        await conn.sendMessage(chatId, helpText, { reply_to_message_id: m.message_id });
        break;
    }
  } else if (command === 'verify') {
    switch (action) {
      case 'on':
        config.verify.enabled = true;
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'verify.enabled'), { reply_to_message_id: m.message_id });
        break;
      case 'off':
        config.verify.enabled = false;
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'verify.disabled'), { reply_to_message_id: m.message_id });
        break;
      case 'action':
        const verifyAction = args[1]?.toLowerCase();
        if (!['mute', 'kick'].includes(verifyAction)) {
          return conn.sendMessage(chatId, await t(chatId, 'verify.action_usage'), { reply_to_message_id: m.message_id });
        }
        config.verify.action = verifyAction;
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'verify.action_success', { action: verifyAction }), { reply_to_message_id: m.message_id });
        break;
      default:
        const verifyStatus = config.verify.enabled ? 'Aktif' : 'Nonaktif';
        const verifyHelpText = [
            await t(chatId, 'verify.status_header'),
            await t(chatId, 'antispam.status_current', { status: verifyStatus }),
            await t(chatId, 'verify.status_action', { action: config.verify.action }),
            `\n${await t(chatId, 'verify.action_usage')}`
        ].join('\n');
        await conn.sendMessage(chatId, verifyHelpText, { reply_to_message_id: m.message_id });
        break;
    }
  }
};

handler.command = ['welcome', 'verify'];
handler.help = ['welcome [on|off|set]', 'verify [on|off|action]'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
