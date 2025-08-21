import { isOwner, requireAdmin, requireBotAdmin } from '../utils.js';

const handler = async ({ conn, m }) => {
  if (!await requireAdmin(conn, m)) return;
  if (!await requireBotAdmin(conn, m, ['can_promote_members'])) return;

  const chatId = m.chat.id;

  if (!m.reply_to_message) {
    return conn.sendMessage(chatId, 'Balas pesan pengguna yang ingin Anda promosikan menjadi admin.', {
      reply_to_message_id: m.message_id
    });
  }

  const targetId = m.reply_to_message.from.id;
  const targetUsername = m.reply_to_message.from.first_name;

  if (isOwner(targetId)) {
    return conn.sendMessage(chatId, 'Owner Bot tidak perlu dipromosikan.', {
        reply_to_message_id: m.message_id
    });
  }

  try {
    await conn.promoteChatMember(chatId, targetId, {
      can_change_info: false,
      can_delete_messages: true,
      can_invite_users: true,
      can_restrict_members: true,
      can_pin_messages: true,
      can_promote_members: false, // Important: prevent new admins from promoting others
    });
    conn.sendMessage(chatId, `✅ Pengguna ${targetUsername} telah berhasil dipromosikan menjadi admin.`, {
      reply_to_message_id: m.message_id
    });
  } catch (err) {
    console.error('Promote error:', err);
    conn.sendMessage(chatId, `Gagal mempromosikan pengguna. Error: ${err.message}`, {
      reply_to_message_id: m.message_id
    });
  }
};

handler.command = ['promote'];
handler.help = ['promote (reply to user)'];
handler.tags = ['admin'];
handler.group = true;
handler.private = false;

export default handler;
