
const [major] = process.versions.node.split('.').map(Number)
if (major < 20) {
  console.error(chalk.red.bold(`
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                      ERROR                                            ║
║                          Minimal Node.js v20 dibutuhkan                          ║
║                              Versi saat ini: v${process.version}                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
`))
  process.exit(1)
}

import TelegramBot from 'node-telegram-bot-api'
import chokidar from 'chokidar'
import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import config from './config.js'
import * as utils from './utils.js'
import { getGroupConfig } from './config-manager.js'
import { recordMessage, checkSpam } from './spam-tracker.js'
import { handleNewMember, handleVerification } from './plugins/welcome.js'

const gradient = (text, colors) => {
  const lines = text.split('\n')
  return lines.map((line, i) => chalk.hex(colors[i % colors.length])(line)).join('\n')
}

console.log(gradient(`
 __   __  ██████╗  ██████╗ ████████╗
 \\ \\ / / ██╔═══██╗██╔═══██╗╚══██╔══╝
  \\ V /  ██║   ██║███████║   ██║
   > <   ██║   ██║██╔══██║   ██║
  / . \\  ╚██████╔╝██║  ██║   ██║
 /_/ \\_\\  ╚═════╝ ╚═╝  ╚═╝   ╚═╝
`, ['#00FFFF', '#00BFFF', '#87CEEB', '#ADD8E6']))

console.log(chalk.cyan.bold('                                     ✨ xBOT Version ✨'))
console.log(chalk.magenta.italic('                                    👨‍💻 by XeyLabs 👨‍💻\n'))

const bot = new TelegramBot(config.telegramBotToken, { polling: true })
const plugins = new Map()
const pluginsDir = path.join(process.cwd(), 'plugins')
global.chatIds = new Set()

async function loadPlugins() {
  plugins.clear()
  let loadedFiles = []
  try {
    const files = await fs.readdir(pluginsDir)
    for (const file of files) {
      if (!file.endsWith('.js')) continue
      const filePath = path.join(pluginsDir, file)
      const modulePath = `file://${filePath}?update=${Date.now()}`
      try {
        const { default: handler } = await import(modulePath)
        if (!handler || !handler.command) {
          console.warn(chalk.yellow.bold(`⚠️  Plugin ${chalk.cyan(file)} tidak punya export default atau command`))
          continue
        }
        const commands = Array.isArray(handler.command) ? handler.command : [handler.command]
        for (const cmd of commands) plugins.set(cmd.toLowerCase(), handler)
        loadedFiles.push(file)
      } catch (err) {
        console.error(chalk.red.bold(`❌ Gagal load plugin ${chalk.cyan(file)}:`), chalk.gray(err.message))
      }
    }
    if (loadedFiles.length > 0) {
      console.log(chalk.green.bold(`✅ Loaded ${chalk.yellow(loadedFiles.length)} plugin:`))
      loadedFiles.forEach(p => console.log(chalk.gray(` ${chalk.blue('└─')} ${chalk.white(p)}`)))
    } else {
      console.log(chalk.yellow.bold('⚠️  Tidak ada plugin berhasil dimuat.'))
    }
  } catch (e) {
    console.error(chalk.red.bold('❌ Gagal membaca direktori plugins:'), chalk.gray(e.message))
  }
}

/**
 * Handles incoming messages for spam violations.
 * @param {object} conn The bot instance.
 * @param {object} msg The message object.
 * @returns {Promise<boolean>} True if a spam action was taken, false otherwise.
 */
async function handleAntiSpam(conn, msg) {
  const { chat, from, text } = msg;
  if (!chat || !from || !text || chat.type === 'private') {
    return false; // Don't process private chats or messages without text
  }

  const config = await getGroupConfig(chat.id);
  if (!config.antiSpam.enabled) {
    return false;
  }

  // Don't check admins or owner for spam
  if (utils.isOwner(from.id) || await utils.isGroupAdmin(conn, chat.id, from.id)) {
      return false;
  }

  recordMessage(chat.id, from.id, text);
  const violation = checkSpam(chat.id, from.id, text, config.antiSpam);

  if (violation) {
    const newWarningCount = utils.recordWarning(chat.id, from.id);
    const userMention = `<a href="tg://user?id=${from.id}">${from.first_name}</a>`;

    if (newWarningCount >= 3) {
      // 3rd strike: Kick
      await conn.banChatMember(chat.id, from.id);
      await conn.sendMessage(chat.id, `${userMention} telah di-kick karena spam berulang (${violation.type}).`, { parse_mode: 'HTML' });
    } else if (newWarningCount === 2) {
      // 2nd strike: Temp-mute for 10 minutes
      const muteUntil = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes from now
      await conn.restrictChatMember(chat.id, from.id, { until_date: muteUntil, can_send_messages: false });
      await conn.sendMessage(chat.id, `${userMention} telah di-mute selama 10 menit karena spam (${violation.type}).`, { parse_mode: 'HTML' });
    } else {
      // 1st strike: Warn
      await conn.sendMessage(chat.id, `Peringatan untuk ${userMention}: Harap tidak melakukan spam (${violation.type}).`, { parse_mode: 'HTML' });
    }
    return true; // Spam action was taken
  }

  return false; // No spam
}


bot.on('message', async (msg) => {
  // Anti-spam check
  if (await handleAntiSpam(bot, msg)) {
    return; // Stop processing if spam was handled
  }

  const from = msg.from
  const chat = msg.chat
  const text = msg.text || ''
  if (chat) global.chatIds.add(chat.id)
  const userTag = from.username ? `@${from.username}` : from.first_name
  const chatType = chat.type === 'private' ? 'PRIVATE' : 'GROUP'
  const chatName = chat.type === 'group' ? chat.title : 'Direct Message'
  console.log(`${chalk.bgBlue.white.bold(`[${chatType}]`)} ${chalk.bgYellow.black.bold(`[${chatName}]`)} ${chalk.gray('from')} ${chalk.bgGreen.white.bold(`[${userTag}]`)}: ${chalk.white.bold(text)}`)
  if (!text.startsWith('/')) return
  const args = text.trim().split(' ')
  let rawCommand = args.shift().substring(1).toLowerCase()
  const command = rawCommand.split('@')[0]
  const handler = plugins.get(command)
  if (handler) {
    try {
      await handler({ conn: bot, m: msg, text: args.join(' '), ...utils })
    } catch (e) {
      console.error(chalk.red.bold(`❌ Error on command /${command}:`), chalk.gray(e))
      bot.sendMessage(chat.id, '❌ Error saat menjalankan perintah.')
    }
  }
})

bot.on('callback_query', async (cb) => {
  if (cb.data && cb.data.startsWith('verify_human_')) {
    return handleVerification(bot, cb);
  }

  const m = { callback_query: cb }
  for (const [, handler] of plugins.entries()) {
    if (typeof handler.before === 'function') {
      try {
        await handler.before(m, { conn: bot, ...utils })
      } catch (e) {
        console.error(chalk.red.bold('❌ Callback error:'), chalk.gray(e))
        bot.answerCallbackQuery(cb.id, { text: '❌ Callback error' })
      }
    }
  }
})

chokidar.watch([pluginsDir, path.join(process.cwd(), 'config.js'), path.join(process.cwd(), 'index.js')], {
  ignored: /^\./, persistent: true, usePolling: true, interval: 500
}).on('change', async (filePath) => {
  const filename = path.basename(filePath)
  if (filename.endsWith('.js') && filePath.includes('plugins')) {
    console.log(chalk.blue.bold(`🔄 Plugin changed:`), chalk.cyan(filename))
    await loadPlugins()
  } else if (filename === 'config.js' || filename === 'index.js') {
    console.log(chalk.redBright.bold(`⚠️  ${filename} was modified. Restarting...`))
    process.exit(0)
  }
})

bot.on('new_chat_members', (msg) => {
    handleNewMember(bot, msg);
});

loadPlugins()
