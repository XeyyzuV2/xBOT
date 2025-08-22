import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.join(__dirname);

/**
 * Dynamically loads all commands from plugin files and groups them by tags.
 * @returns {Promise<object>} An object where keys are tags and values are arrays of commands.
 */
async function loadCommands() {
  const groups = {};

  try {
    const files = await fs.readdir(pluginsDir);

    for (const file of files) {
      if (!file.endsWith('.js') || file === 'listcmd.js') continue;

      const filePath = path.join(pluginsDir, file);
      const modulePath = `file://${filePath}?v=${Date.now()}`;

      try {
        const plugin = (await import(modulePath)).default;
        if (!plugin?.command || !plugin?.tags) continue;

        const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        const tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags];

        for (const tag of tags) {
          if (!groups[tag]) groups[tag] = [];
          // Add all command aliases to the group, prefixed with '/'
          commands.forEach(cmd => {
              if (!groups[tag].includes(`/${cmd}`)) {
                  groups[tag].push(`/${cmd}`);
              }
          });
        }
      } catch (pluginErr) {
        console.error(`Error loading plugin info from ${file}:`, pluginErr);
        continue;
      }
    }
  } catch (err) {
    console.error('Error reading plugins directory for command list:', err);
  }
  return groups;
}

const handler = async ({ conn, m }) => {
  const groups = await loadCommands();

  let message = '📜 *Daftar Perintah Bot*\n\n';

  const sortedTags = Object.keys(groups).sort();

  for (const tag of sortedTags) {
    // Capitalize first letter of tag for display
    const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
    message += `*${formattedTag}*\n`;
    message += `\`\`\`${groups[tag].join(', ')}\`\`\`\n\n`;
  }

  message += `Gunakan perintah di atas untuk berinteraksi dengan bot.`;

  await conn.sendMessage(m.chat.id, message, {
    parse_mode: 'Markdown',
    reply_to_message_id: m.message_id
  });
};

handler.command = ['listcmd', 'cmd', 'help', 'perintah'];
handler.help = ['listcmd'];
handler.tags = ['main'];
handler.group = true;
handler.private = false;

export default handler;
