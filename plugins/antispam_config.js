import { requireAdmin } from '../utils.js';
import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { t } from '../i18n.js';

const handler = async ({ conn, m, text }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;
  const args = text.trim().split(' ').filter(arg => arg);
  const subCommand = args[0]?.toLowerCase();

  let config = await getGroupConfig(chatId);

  switch (subCommand) {
    case 'on':
      config.antiSpam.enabled = true;
      await setGroupConfig(chatId, config);
      await conn.sendMessage(chatId, await t(chatId, 'antispam.enabled'), { reply_to_message_id: m.message_id });
      break;

    case 'off':
      config.antiSpam.enabled = false;
      await setGroupConfig(chatId, config);
      await conn.sendMessage(chatId, await t(chatId, 'antispam.disabled'), { reply_to_message_id: m.message_id });
      break;

    case 'set':
      const setType = args[1]?.toLowerCase();
      if (setType === 'flood') {
        const count = parseInt(args[2]);
        const windowSec = parseInt(args[3]);
        if (!count || !windowSec || count < 1 || windowSec < 1) {
          return conn.sendMessage(chatId, await t(chatId, 'antispam.set_flood_usage'), { reply_to_message_id: m.message_id });
        }
        config.antiSpam.flood = { count, windowSec };
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'antispam.set_flood_success', { count, windowSec }), { reply_to_message_id: m.message_id });
      } else {
        await conn.sendMessage(chatId, await t(chatId, 'antispam.set_unknown'), { reply_to_message_id: m.message_id });
      }
      break;

    case 'whitelist':
      const wlAction = args[1]?.toLowerCase();
      const domain = args[2]?.toLowerCase();

      if (wlAction === 'add') {
        if (!domain) return conn.sendMessage(chatId, await t(chatId, 'antispam.whitelist_add_usage'), { reply_to_message_id: m.message_id });
        config.antiSpam.linkWhitelist = [...new Set([...config.antiSpam.linkWhitelist, domain])];
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'antispam.whitelist_add_success', { domain }), { reply_to_message_id: m.message_id });

      } else if (wlAction === 'remove') {
        if (!domain) return conn.sendMessage(chatId, await t(chatId, 'antispam.whitelist_remove_usage'), { reply_to_message_id: m.message_id });
        config.antiSpam.linkWhitelist = config.antiSpam.linkWhitelist.filter(d => d !== domain);
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'antispam.whitelist_remove_success', { domain }), { reply_to_message_id: m.message_id });

      } else if (wlAction === 'list') {
        const header = await t(chatId, 'antispam.whitelist_list_header');
        const list = config.antiSpam.linkWhitelist.join('\n') || await t(chatId, 'antispam.whitelist_list_empty');
        await conn.sendMessage(chatId, `${header}\n${list}`, { reply_to_message_id: m.message_id });

      } else {
        await conn.sendMessage(chatId, await t(chatId, 'antispam.whitelist_usage'), { reply_to_message_id: m.message_id });
      }
      break;

    default:
      const statusText = config.antiSpam.enabled ? 'Aktif' : 'Nonaktif';
      const floodRuleText = `${config.antiSpam.flood.count} pesan / ${config.antiSpam.flood.windowSec} dtk`;
      const whitelistCountNum = config.antiSpam.linkWhitelist.length;

      const helpText = [
        await t(chatId, 'antispam.status_header'),
        '',
        await t(chatId, 'antispam.status_current', { status: statusText }),
        await t(chatId, 'antispam.status_flood_rule', { rule: floodRuleText }),
        await t(chatId, 'antispam.status_whitelist_count', { count: whitelistCountNum }),
        '',
        await t(chatId, 'antispam.status_usage')
      ].join('\n');

      await conn.sendMessage(chatId, helpText, { reply_to_message_id: m.message_id });
      break;
  }
};

handler.command = ['antispam'];
handler.help = ['antispam [on|off|set|whitelist]'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
