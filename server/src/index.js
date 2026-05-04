import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import userRoutes from "./routes/user.routes.js";

// Middleware imports
import { notFound, errorHandler } from "./middleware/error.middleware.js";

// ── Load env ────────────────────────────────
dotenv.config({ path: "../.env" });

// ── Connect to MongoDB ──────────────────────
connectDB();

const app = express();

// ── Global Middleware ───────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// ── API Routes ──────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/users", userRoutes);

// ── Error Handling ──────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🛡️  AegisVault API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
