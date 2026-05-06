import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import userRoutes from "./routes/user.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import shareRoutes from "./routes/share.routes.js";

// Middleware imports
import { notFound, errorHandler } from "./middleware/error.middleware.js";

/**
 * Create and configure the Express application.
 * Exported separately so tests can import the app without starting the server.
 */
export function createApp() {
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

  // Only log in non-test environments
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // ── API Routes ──────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/share", shareRoutes);

  // ── Error Handling ──────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
