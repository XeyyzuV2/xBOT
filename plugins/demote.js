import { isOwner, requireAdmin, requireBotAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  if (!await requireAdmin(conn, m)) return;
  if (!await requireBotAdmin(conn, m, ['can_promote_members'])) return;

  const chatId = m.chat.id;

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan admin yang ingin Anda turunkan jabatannya.', {
      reply_to_message_id: m.message_id
    });
  }

  const targetId = m.reply_to_message.from.id;
  const targetUsername = m.reply_to_message.from.first_name;

  if (isOwner(targetId)) {
    return conn.sendMessage(chatId, 'Tidak bisa menurunkan jabatan Owner Bot.', {
        reply_to_message_id: m.message_id
    });
  }

  try {
    await conn.promoteChatMember(chatId, targetId, {
      can_change_info: false,
      can_delete_messages: false,
      can_invite_users: false,
      can_restrict_members: false,
      can_pin_messages: false,
      can_promote_members: false,
    });
    conn.sendMessage(chatId, `✅ Jabatan admin untuk pengguna ${targetUsername} telah dicabut.`, {
      reply_to_message_id: m.message_id
    });
  } catch (err) {
    console.error('Demote error:', err);
    conn.sendMessage(chatId, `Gagal menurunkan jabatan pengguna. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['demote'];
handler.help = ['demote (reply to user)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
