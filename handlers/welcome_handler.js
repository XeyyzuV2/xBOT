import { getGroupConfig } from '../config-manager.js';
import { t } from '../i18n.js';
import { logEvent } from '../logger.js';

// Store timeouts so we can clear them if a user verifies successfully.
const verificationTimeouts = {}; // { `chatId_userId`: timeoutId }

/**
 * Handles the logic when a new member joins a group.
 * @param {object} conn The bot instance.
 * @param {object} msg The message object containing the new member info.
 */
export async function handleNewMember(conn, msg) {
  const chatId = msg.chat.id;
  const newMembers = msg.new_chat_members;

  if (!newMembers || newMembers.length === 0) {
    return;
  }

  const config = await getGroupConfig(chatId);
  if (!config.welcome.enabled) {
    return;
  }

  for (const member of newMembers) {
    const placeholders = {
        first_name: member.first_name,
        mention: `<a href="tg://user?id=${member.id}">${member.first_name}</a>`,
        group_name: msg.chat.title,
    };

    // A simple placeholder replacement
    let welcomeMessage = config.welcome.message
        .replace(/{first_name}/g, placeholders.first_name)
        .replace(/{mention}/g, placeholders.mention)
        .replace(/{group_name}/g, placeholders.group_name);

    const isPremium = config.premiumUntil && config.premiumUntil > Date.now();

    if (config.verify.enabled && isPremium) {
        // Restrict user first
        try {
            await conn.restrictChatMember(chatId, member.id, {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_other_messages: false,
            });

            const keyboard = {
                inline_keyboard: [[{
                    text: '✅ Saya Manusia',
                    callback_data: `verify_human_${member.id}`
                }]]
            };

            const sentMessage = await conn.sendMessage(chatId, welcomeMessage, {
                parse_mode: 'HTML',
                reply_markup: JSON.stringify(keyboard),
            });

            // Set a timeout for verification
            const timeoutKey = `${chatId}_${member.id}`;
            const timeout = setTimeout(async () => {
                // Check if user is still restricted (i.e., hasn't verified)
                const currentMember = await conn.getChatMember(chatId, member.id);
                if (!currentMember.can_send_messages) {
                    const action = config.verify.action;
                    if (action === 'kick') {
                        await conn.banChatMember(chatId, member.id);
                        await conn.unbanChatMember(chatId, member.id); // So they can rejoin
                        await conn.editMessageText(`Maaf ${placeholders.first_name}, waktu verifikasi habis. Anda telah dikeluarkan.`, {
                            chat_id: chatId,
                            message_id: sentMessage.message_id,
                        });
                    } else { // 'mute'
                        await conn.editMessageText(`Maaf ${placeholders.first_name}, waktu verifikasi habis. Anda tetap di-mute. Hubungi admin untuk di-unmute.`, {
                            chat_id: chatId,
                            message_id: sentMessage.message_id,
                        });
                    }
                    await logEvent(conn, chatId, 'verification_failed', {
                        chat: msg.chat,
                        user: member,
                        action: action,
                    });
                }
                delete verificationTimeouts[timeoutKey];
            }, 60 * 1000); // 60 seconds

            verificationTimeouts[timeoutKey] = timeout;

        } catch (err) {
            console.error(`Welcome/Verify error for user ${member.id} in chat ${chatId}:`, err.message);
        }

    } else {
        // Just send a normal welcome message
        await conn.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
    }
  }
}

/**
 * Handles the verification callback query.
 * @param {object} conn The bot instance.
 * @param {object} cb The callback query object.
 */
export async function handleVerification(conn, cb) {
  // Answer immediately
  conn.answerCallbackQuery(cb.id).catch(() => {});

  const [,, targetUserId] = cb.data.split('_');
  const fromId = cb.from.id;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;

  if (fromId.toString() !== targetUserId) {
    return conn.answerCallbackQuery(cb.id, { text: 'Ini bukan tombol untukmu.' });
  }

  const timeoutKey = `${chatId}_${targetUserId}`;
  if (verificationTimeouts[timeoutKey]) {
      clearTimeout(verificationTimeouts[timeoutKey]);
      delete verificationTimeouts[timeoutKey];
  }

  try {
    await conn.restrictChatMember(chatId, fromId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });

    await conn.editMessageText(`✅ ${cb.from.first_name} telah diverifikasi! Selamat datang!`, {
        chat_id: chatId,
        message_id: messageId,
    });

  } catch (err) {
    console.error(`Verification handling error for user ${fromId} in chat ${chatId}:`, err.message);
    await conn.answerCallbackQuery(cb.id, { text: 'Gagal memproses verifikasi.' });
  }
}
