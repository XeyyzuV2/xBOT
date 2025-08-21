import { requireAdmin, isOwner } from '../utils.js';
import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { t } from '../i18n.js';
import moment from 'moment-timezone';

const handler = async ({ conn, m, text }) => {
  const chatId = m.chat.id;
  const fromId = m.from.id;

  const args = text.trim().split(' ');
  const subCommand = args[0]?.toLowerCase();

  if (subCommand === 'enable' || subCommand === 'disable') {
    if (!isOwner(fromId)) {
        return conn.sendMessage(chatId, await t(chatId, 'premium.owner_only'), { reply_to_message_id: m.message_id });
    }

    let config = await getGroupConfig(chatId);
    if (subCommand === 'enable') {
        const days = parseInt(args[1]);
        if (isNaN(days) || days <= 0) {
            return conn.sendMessage(chatId, await t(chatId, 'premium.enable_usage'), { reply_to_message_id: m.message_id });
        }
        const newPremiumUntil = Date.now() + (days * 24 * 60 * 60 * 1000);
        config.premiumUntil = newPremiumUntil;
        await setGroupConfig(chatId, config);
        const expiryDate = moment(newPremiumUntil).tz('Asia/Jakarta').format('DD MMMM YYYY HH:mm');
        await conn.sendMessage(chatId, await t(chatId, 'premium.enable_success', { days, expiryDate }), { reply_to_message_id: m.message_id });
    } else { // disable
        config.premiumUntil = null;
        await setGroupConfig(chatId, config);
        await conn.sendMessage(chatId, await t(chatId, 'premium.disabled_success'), { reply_to_message_id: m.message_id });
    }

  } else if (subCommand === 'status' || !subCommand) {
    if (!await requireAdmin(conn, m)) return;
    const config = await getGroupConfig(chatId);
    if (config.premiumUntil && config.premiumUntil > Date.now()) {
        const expiryDate = moment(config.premiumUntil).tz('Asia/Jakarta').format('DD MMMM YYYy HH:mm');
        await conn.sendMessage(chatId, await t(chatId, 'premium.status_active', { expiryDate }), { reply_to_message_id: m.message_id });
    } else {
        await conn.sendMessage(chatId, await t(chatId, 'premium.status_inactive'), { reply_to_message_id: m.message_id });
    }
  } else {
      await conn.sendMessage(chatId, await t(chatId, 'premium.unknown_command'), { reply_to_message_id: m.message_id });
  }
};

handler.command = ['premium'];
handler.help = ['premium [status|enable|disable]'];
handler.tags = ['admin', 'owner'];
handler.group = true;
handler.private = false;

export default handler;
