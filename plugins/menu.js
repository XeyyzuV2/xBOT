import { getGroupConfig, setGroupConfig } from '../config-manager.js';
import { requireAdmin, isGroupAdmin } from '../utils.js';
import { t } from '../i18n.js';
import { getIcon } from '../theme-manager.js';

// --- Menu Generation Functions ---

async function generateMainMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const theme = config.theme;
    const text = await t(chatId, 'menu.main_text');
    const keyboard = [
        [
            { text: `${getIcon(theme, 'antispam')} ${await t(chatId, 'menu.main_btn_antispam')}`, callback_data: 'menu:page:antispam' },
            { text: `${getIcon(theme, 'welcome')} ${await t(chatId, 'menu.main_btn_welcome')}`, callback_data: 'menu:page:welcome' }
        ],
        [
            { text: `${getIcon(theme, 'log')} ${await t(chatId, 'menu.main_btn_log')}`, callback_data: 'menu:page:log' },
            { text: `${getIcon(theme, 'lang')} ${await t(chatId, 'menu.main_btn_lang')}`, callback_data: 'menu:page:lang' }
        ],
        [{ text: `${getIcon(theme, 'close')} ${await t(chatId, 'menu.main_btn_close')}`, callback_data: 'menu:action:close' }]
    ];
    return { text, keyboard };
}

async function generateAntiSpamMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const status = config.antiSpam.enabled ? '✅ ON' : '❌ OFF';
    const floodRule = `${config.antiSpam.flood.count} msg / ${config.antiSpam.flood.windowSec}s`;
    const text = `${await t(chatId, 'menu.antispam_text', { status })}\nFlood Rule: ${floodRule}`;

    const keyboard = [
        [{ text: await t(chatId, 'menu.antispam_btn_toggle', { status }), callback_data: `menu:toggle:as:${config.antiSpam.enabled ? 'off' : 'on'}` }],
        [
            { text: 'Count -', callback_data: 'menu:set:as_flood_count:decr' },
            { text: `Count: ${config.antiSpam.flood.count}`, callback_data: 'menu:noop' },
            { text: 'Count +', callback_data: 'menu:set:as_flood_count:incr' }
        ],
        [
            { text: 'Window -', callback_data: 'menu:set:as_flood_window:decr' },
            { text: `Window: ${config.antiSpam.flood.windowSec}s`, callback_data: 'menu:noop' },
            { text: 'Window +', callback_data: 'menu:set:as_flood_window:incr' }
        ],
        [{ text: await t(chatId, 'menu.back_btn'), callback_data: 'menu:page:main' }]
    ];
    return { text, keyboard };
}

async function generateWelcomeMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const welcomeStatus = config.welcome.enabled ? '✅ ON' : '❌ OFF';
    const verifyStatus = config.verify.enabled ? '✅ ON' : '❌ OFF';
    const verifyAction = config.verify.action;
    const text = `${await t(chatId, 'menu.welcome_text', { welcomeStatus, verifyStatus })}\nAction: ${verifyAction}`;

    const keyboard = [
        [{ text: await t(chatId, 'menu.welcome_btn_toggle_welcome', { status: welcomeStatus }), callback_data: `menu:toggle:welcome:${config.welcome.enabled ? 'off' : 'on'}` }],
        [{ text: await t(chatId, 'menu.welcome_btn_toggle_verify', { status: verifyStatus }), callback_data: `menu:toggle:verify:${config.verify.enabled ? 'off' : 'on'}` }],
        [{ text: `Action: ${verifyAction.toUpperCase()}`, callback_data: `menu:set:verify_action:cycle` }],
        [{ text: await t(chatId, 'menu.back_btn'), callback_data: 'menu:page:main' }]
    ];
    return { text, keyboard };
}

async function generateLogMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const status = config.log.channelId ? `✅ ON (${config.log.channelId})` : '❌ OFF';
    const text = await t(chatId, 'menu.log_text', { status });
    const keyboard = [
        [{ text: await t(chatId, 'menu.back_btn'), callback_data: 'menu:page:main' }]
    ];
    return { text, keyboard };
}

async function generateLangMenu(chatId) {
    const config = await getGroupConfig(chatId);
    const text = await t(chatId, 'menu.lang_text', { lang: config.lang.toUpperCase() });
    const keyboard = [
        [{ text: await t(chatId, 'menu.lang_btn_id'), callback_data: 'menu:set:lang:id' }, { text: await t(chatId, 'menu.lang_btn_en'), callback_data: 'menu:set:lang:en' }],
        [{ text: await t(chatId, 'menu.back_btn'), callback_data: 'menu:page:main' }]
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
    // Answer the callback immediately to prevent "query is too old" errors
    conn.answerCallbackQuery(cb.id).catch(() => {});

    const { data, message } = cb;
    const chatId = message.chat.id;
    
    if (!await isGroupAdmin(conn, chatId, cb.from.id)) {
        return conn.answerCallbackQuery(cb.id, { text: await t(chatId, 'menu.admin_only_error') });
    }

    const [prefix, action, key, value] = data.split(':');

    if (prefix !== 'menu') return conn.answerCallbackQuery(cb.id);

    let config = await getGroupConfig(chatId);
    let menuData;

    switch (action) {
        case 'page':
            if (key === 'main') menuData = await generateMainMenu(chatId);
            else if (key === 'antispam') menuData = await generateAntiSpamMenu(chatId);
            else if (key === 'welcome') menuData = await generateWelcomeMenu(chatId);
            else if (key === 'log') menuData = await generateLogMenu(chatId);
            else if (key === 'lang') menuData = await generateLangMenu(chatId);
            break;

        case 'toggle':
            const newState = value === 'on';
            if (key === 'as') config.antiSpam.enabled = newState;
            else if (key === 'welcome') config.welcome.enabled = newState;
            else if (key === 'verify') config.verify.enabled = newState;
            await setGroupConfig(chatId, config);
            // Regenerate the appropriate menu
            if (key === 'as') menuData = await generateAntiSpamMenu(chatId);
            else if (key === 'welcome' || key === 'verify') menuData = await generateWelcomeMenu(chatId);
            break;

        case 'set':
            if (key === 'lang') {
                config.lang = value;
            } else if (key === 'as_flood_count') {
                let count = config.antiSpam.flood.count;
                if (value === 'incr') count++;
                else if (value === 'decr' && count > 1) count--;
                config.antiSpam.flood.count = count;
            } else if (key === 'as_flood_window') {
                let window = config.antiSpam.flood.windowSec;
                if (value === 'incr') window++;
                else if (value === 'decr' && window > 1) window--;
                config.antiSpam.flood.windowSec = window;
            } else if (key === 'verify_action') {
                config.verify.action = config.verify.action === 'mute' ? 'kick' : 'mute';
            }
            await setGroupConfig(chatId, config);

            // Regenerate the appropriate menu
            if (key.startsWith('as_')) menuData = await generateAntiSpamMenu(chatId);
            else if (key.startsWith('verify_')) menuData = await generateWelcomeMenu(chatId);
            else if (key === 'lang') menuData = await generateLangMenu(chatId);
            break;

        case 'action':
            if (key === 'close') return await conn.deleteMessage(chatId, message.message_id);
            break;
    }

    if (menuData) {
        try {
            await conn.editMessageText(menuData.text, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: menuData.keyboard }
            });
        } catch (e) {
            // Ignore error if message is not modified
        }
    }
}


handler.command = ['start', 'menu', 'settings'];
handler.help = ['start', 'menu'];
handler.tags = ['main', 'admin'];
handler.group = true;
handler.private = false;

export default handler;
