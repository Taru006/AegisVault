import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import { createApp } from "./app.js";
import { initSocket } from "./config/socket.js";
import { startCronJobs } from "./cron/shareCron.js";

// ── Load env ────────────────────────────────
dotenv.config({ path: "../.env" });

// ── Connect to MongoDB ──────────────────────
connectDB();

// ── Create & Start Server ───────────────────
const app = createApp();
const PORT = process.env.PORT || 5000;

// Create HTTP server to attach Socket.io
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start Background Cron Jobs
startCronJobs();

server.listen(PORT, () => {
  console.log(`🛡️  AegisVault API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
