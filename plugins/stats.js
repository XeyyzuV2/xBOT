import { isOwner } from '../utils.js';
import os from 'os';

/**
 * Formats bytes into a human-readable string.
 * @param {number} bytes The number of bytes.
 * @returns {string} The formatted string.
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats seconds into a human-readable uptime string.
 * @param {number} seconds The total seconds.
 * @returns {string} The formatted uptime string.
 */
function formatUptime(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= (24 * 3600);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
}

const handler = async ({ conn, m }) => {
  if (!isOwner(m.from.id)) {
    // Silently ignore if not owner
    return;
  }

  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const totalGroups = global.chatIds ? global.chatIds.size : 0;

    const statsMessage = `
📊 *Bot Statistics* 📊

*System:*
- *OS:* ${os.type()} ${os.release()}
- *CPU Arch:* ${os.arch()}
- *Uptime:* ${formatUptime(uptime)}

*Memory:*
- *RSS:* ${formatBytes(memoryUsage.rss)}
- *Heap Total:* ${formatBytes(memoryUsage.heapTotal)}
- *Heap Used:* ${formatBytes(memoryUsage.heapUsed)}

*Bot:*
- *Total Chats:* ${totalGroups}
- *Node.js Version:* ${process.version}
    `;

    await conn.sendMessage(m.chat.id, statsMessage, {
        parse_mode: 'Markdown',
        reply_to_message_id: m.message_id
    });

  } catch (err) {
    console.error('Stats error:', err);
    await conn.sendMessage(m.chat.id, 'Gagal mengambil statistik bot.', {
        reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['stats', 'status'];
handler.help = ['stats'];
handler.tags = ['owner'];
handler.private = true;

export default handler;
