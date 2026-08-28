import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env, logger } from "./config";
import { errorHandler } from "./middleware";
import { ensureEmailIndex } from "./services/elasticsearchIndexer";

// ── Routes ──
import authRoutes from "./routes/auth";
import emailRoutes from "./routes/emails";
import senderRoutes from "./routes/senders";
import leadsRoutes from "./routes/leads";
import slackRoutes from "./routes/slack";

// ── Bull-Board Admin ──
import { serverAdapter } from "./admin/bullBoard";

// ── Workers (importing boots them — they attach to existing Redis queues) ──
import "./workers/mainWorker";
import "./workers/retryWorker";

// ────────────────────────────────────────────────────────────
// Express Application
// ────────────────────────────────────────────────────────────

const app = express();

// ── Global Middleware ──
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── API Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/slack", slackRoutes);

// ── Bull-Board Admin UI ──
app.use("/admin/queues", serverAdapter.getRouter());

// ── Health Check ──
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Global Error Handler (must be last) ──
app.use(errorHandler);

// ────────────────────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // Ensure ES index exists on startup
  try {
    await ensureEmailIndex();
    logger.info("Elasticsearch index ready");
  } catch (err) {
    logger.warn("Elasticsearch not available — search will not work until ES is up", {
      error: (err as Error).message,
    });
  }

  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📊 Bull-Board at http://localhost:${env.PORT}/admin/queues`);
    logger.info(`🔧 Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", { error: err });
  process.exit(1);
});

export default app;
