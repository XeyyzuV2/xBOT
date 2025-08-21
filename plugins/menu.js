import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { requireAdmin, isOwner } from '../utils.js';
import { t } from '../i18n.js';

// --- Menu Generation Functions ---

async function generateMainMenu(chatId) {
    const text = '⚙️ *Bot Settings Menu*\n\nPilih kategori untuk dikonfigurasi.';
    const keyboard = [
        [
            { text: '🛡 Anti-Spam', callback_data: 'menu:antispam' },
            { text: '👋 Welcome', callback_data: 'menu:welcome' }
        ],
        [
            { text: '📜 Logging', callback_data: 'menu:log' },
            { text: '🌐 Bahasa', callback_data: 'menu:lang' }
        ],
        [{ text: '❌ Tutup', callback_data: 'menu:close' }]
    ];
    return { text, keyboard };
}

async function generateAntiSpamMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const status = config.antiSpam.enabled ? '✅ ON' : '❌ OFF';
    const text = `🛡 *Anti-Spam Settings*\n\nStatus saat ini: ${status}`;
    const keyboard = [
        [{ text: `Toggle Anti-Spam: ${status}`, callback_data: `toggle:antispam:${config.antiSpam.enabled ? 'off' : 'on'}` }],
        [{ text: 'Kembali', callback_data: 'menu:main' }]
    ];
    return { text, keyboard };
}

async function generateWelcomeMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const welcomeStatus = config.welcome.enabled ? '✅ ON' : '❌ OFF';
    const verifyStatus = config.verify.enabled ? '✅ ON' : '❌ OFF';
    const text = `👋 *Welcome & Verify Settings*\n\nWelcome: ${welcomeStatus}\nVerify: ${verifyStatus}`;
    const keyboard = [
        [{ text: `Toggle Welcome: ${welcomeStatus}`, callback_data: `toggle:welcome:${config.welcome.enabled ? 'off' : 'on'}` }],
        [{ text: `Toggle Verify: ${verifyStatus}`, callback_data: `toggle:verify:${config.verify.enabled ? 'off' : 'on'}` }],
        [{ text: 'Kembali', callback_data: 'menu:main' }]
    ];
    return { text, keyboard };
}

async function generateLogMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const status = config.log.channelId ? `✅ ON (${config.log.channelId})` : '❌ OFF';
    const text = `📜 *Logging Settings*\n\nStatus saat ini: ${status}\n\nGunakan /setlog untuk mengubah channel.`;
    const keyboard = [
        [{ text: 'Kembali', callback_data: 'menu:main' }]
    ];
    return { text, keyboard };
}

async function generateLangMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const text = `🌐 *Language Settings*\n\nBahasa saat ini: ${config.lang.toUpperCase()}`;
    const keyboard = [
        [{ text: '🇮🇩 Indonesia', callback_data: 'toggle:lang:id' }, { text: '🇬🇧 English', callback_data: 'toggle:lang:en' }],
        [{ text: 'Kembali', callback_data: 'menu:main' }]
    ];
    return { text, keyboard };
}

// --- Main Command Handler ---

const handler = async ({ conn, m }) => {
    if (!await requireAdmin(conn, m)) return;
    const { text, keyboard } = await generateMainMenu(m.chat.id);
    await conn.sendMessage(m.chat.id, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard },
        reply_to_message_id: m.message_id
    });
};

// --- Callback Handler ---

export async function handleMenuCallback(conn, cb) {
    const { data, message } = cb;
    const chatId = message.chat.id;
    
    if (!await isGroupAdmin(conn, chatId, cb.from.id)) {
        return conn.answerCallbackQuery(cb.id, { text: 'Anda harus menjadi admin untuk menggunakan menu ini.' });
    }

    const [type, key, value] = data.split(':');

    if (type === 'menu') {
        let menuData;
        if (key === 'main') {
            menuData = await generateMainMenu(chatId);
        } else if (key === 'antispam') {
            menuData = await generateAntiSpamMenu(chatId);
        } else if (key === 'welcome') {
            menuData = await generateWelcomeMenu(chatId);
        } else if (key === 'log') {
            menuData = await generateLogMenu(chatId);
        } else if (key === 'lang') {
            menuData = await generateLangMenu(chatId);
        } else if (key === 'close') {
            return await conn.deleteMessage(chatId, message.message_id);
        }
        
        if (menuData) {
            await conn.editMessageText(menuData.text, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: menuData.keyboard }
            });
        }
    } else if (type === 'toggle') {
        let config = await getGroupConfig(chatId);
        const newState = value === 'on';
        
        if (key === 'antispam') {
            config.antiSpam.enabled = newState;
        } else if (key === 'welcome') {
            config.welcome.enabled = newState;
        } else if (key === 'verify') {
            config.verify.enabled = newState;
        }

        await setGroupConfig(chatId, config);

        // Regenerate the same menu to show the updated state
        let updatedMenuData;
        if (key === 'antispam') {
            updatedMenuData = await generateAntiSpamMenu(chatId);
        } else if (key === 'welcome' || key === 'verify') {
            updatedMenuData = await generateWelcomeMenu(chatId);
        } else if (key === 'lang') {
            config.lang = value; // value is 'id' or 'en'
            await setGroupConfig(chatId, config);
            updatedMenuData = await generateLangMenu(chatId);
        }

        if (updatedMenuData) {
            await conn.editMessageText(updatedMenuData.text, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: updatedMenuData.keyboard }
            });
        }
    }
    
    await conn.answerCallbackQuery(cb.id);
}


handler.command = ['menu', 'settings'];
handler.help = ['menu'];
handler.tags = ['main', 'admin'];
handler.group = true;
handler.private = false;

export default handler;
