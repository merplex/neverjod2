import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import authRouter from "./routes/auth";
import syncRouter from "./routes/sync";
import ledgersRouter from "./routes/ledgers";
import subscriptionRouter from "./routes/subscription";
import appleNotificationsRouter from "./routes/appleNotifications";
import { initDB } from "./db";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Init DB tables
  initDB().catch(console.error);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth & Sync
  app.use("/api/auth", authRouter);
  app.use("/api/sync", syncRouter);
  app.use("/api/ledgers", ledgersRouter);
  app.use("/api/subscription", subscriptionRouter);
  app.use("/api/apple-notifications", appleNotificationsRouter);

  return app;
}
