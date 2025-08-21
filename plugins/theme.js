import { requireAdmin } from '../utils.js';
import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { getAvailableThemes } from '../theme-manager.js';
import { t } from '../i18n.js';

const handler = async ({ conn, m, text }) => {
  if (!await requireAdmin(conn, m)) return;

  const chatId = m.chat.id;
  const args = text.trim().split(' ');
  const subCommand = args[0]?.toLowerCase();

  const availableThemes = getAvailableThemes();

  if (subCommand === 'set') {
    const themeName = args[1]?.toLowerCase();
    if (!themeName || !availableThemes.includes(themeName)) {
        const message = await t(chatId, 'theme.invalid', { themes: availableThemes.join(', ') });
        return conn.sendMessage(chatId, message, { reply_to_message_id: m.message_id });
    }
    let config = await getGroupConfig(chatId);
    config.theme = themeName;
    await setGroupConfig(chatId, config);
    const message = await t(chatId, 'theme.set_success', { theme: themeName });
    await conn.sendMessage(chatId, message, { reply_to_message_id: m.message_id });

  } else { // Default action is to list themes
    const config = await getGroupConfig(chatId);
    const currentTheme = config.theme;

    let listText = `${await t(chatId, 'theme.list_header')}\n`;
    listText += availableThemes.map(theme => {
        const icon = theme === currentTheme ? '🔹' : '🔸';
        return `${icon} ${theme}`;
    }).join('\n');
    listText += await t(chatId, 'theme.list_usage');

    await conn.sendMessage(chatId, listText, { parse_mode: 'Markdown', reply_to_message_id: m.message_id });
  }
};

handler.command = ['theme'];
handler.help = ['theme [set <name>]'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
