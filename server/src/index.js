import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { createApp } from "./app.js";

// ── Load env ────────────────────────────────
dotenv.config({ path: "../.env" });

// ── Connect to MongoDB ──────────────────────
connectDB();

// ── Create & Start Server ───────────────────
const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🛡️  AegisVault API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
