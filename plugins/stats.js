import { isOwner, formatBytes, formatUptime } from '../utils.js';
import { getStatsFromLogs } from '../log-parser.js';
import { countActivePremium } from '../config-manager.js';
import os from 'os';
import moment from 'moment-timezone';

const handler = async ({ conn, m }) => {
  if (!isOwner(m.from.id)) {
    return; // Silently ignore if not owner
  }

  try {
    const [logStats, premiumCount] = await Promise.all([
        getStatsFromLogs(),
        countActivePremium()
    ]);

    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const totalGroups = global.chatIds ? global.chatIds.size : 0;
    const cpuUsage = os.loadavg()[0]; // 1-minute load average as a proxy for CPU usage
    const date = moment().tz('Asia/Jakarta').format('DD MMM YYYY, HH:mm:ss');

    const topRules = Object.entries(logStats.topRules)
        .sort(([, a], [, b]) => b - a)
        .map(([key, value]) => `${key}(${value})`)
        .join(', ');

    const statsMessage = "```\n" +
      `📊 xBOT Status — ${date}\n` +
      `─────────────────────────\n` +
      `Groups     : ${totalGroups}\n` +
      `Users*     : N/A\n` +
      `Incidents  : ${logStats.incidents24h} (24h)\n` +
      `Premium    : ${premiumCount}\n` +
      `Uptime     : ${formatUptime(uptime)}\n` +
      `CPU/RAM    : ${cpuUsage.toFixed(2)}% / ${formatBytes(memoryUsage.rss)}\n` +
      `Top Rules  : ${topRules || 'N/A'}` +
      "\n```";

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
