import cors from "cors";
import dotenv from "dotenv";
import express, { Application } from "express";
import compression from "compression";
import authRoutes from "./Routes/authRoutes";
import chamaRoutes from "./Routes/chamaRoutes";
import cronRoutes from "./Routes/cronRoutes";
import miniappRoutes from "./Routes/miniappRoutes";
import pretiumRoutes from "./Routes/pretiumRoutes";
import userRoutes from "./Routes/userRoutes";
import paymasterRoutes from "./Routes/paymasterRoutes";
import statsRoutes from "./Routes/statsRoutes";
import webhookRoutes from "./Routes/webhookRoutes";
import moonwellRoutes from "./Routes/moonwellRoutes";


import axios from "axios";

// Load environment variables
dotenv.config();

// Set global default timeout for all external axios requests to 10 seconds
axios.defaults.timeout = 10_000;

// Create Express application
const app: Application = express();

// Request timing logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// Middleware
app.use(compression());
app.use(
  express.json({
    verify: (req, res, buf) => {
      (req as any).rawBody = buf.toString();
    },
  }),
);
app.use(cors());

// Routes
app.use("/auth", authRoutes); // All auth-related routes (e.g., /auth/register, /auth/login)
app.use("/user", userRoutes); // All user-related routes
app.use("/chama", chamaRoutes); // All chama-related routes
app.use("/cron", cronRoutes);
app.use("/pretium", pretiumRoutes);
app.use("/webhooks", webhookRoutes); // Webhook routes for external services
app.use("/miniapp", miniappRoutes); // Miniapp-specific endpoints
app.use("/paymaster", paymasterRoutes); // CDP paymaster proxy for client wallet_sendCalls
app.use("/stats", statsRoutes); // Public platform metrics for landing page
app.use("/moonwell", moonwellRoutes); // Moonwell real-time data and transactions

// FX test harness (M-Pesa sandbox + Base Sepolia escrow). Only load when enabled
// so missing M-Pesa env vars do not crash production boots.
if (process.env.FX_TEST_ENABLED === "true") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mpesaRoutes = require("./Routes/mpesaRoutes").default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fxTestRoutes = require("./Routes/fxTestRoutes").default;
  app.use("/mpesa", mpesaRoutes);
  app.use("/fx-test", fxTestRoutes);
  console.log("[FX test] Mounted /mpesa and /fx-test routes");
}

// Platform configuration endpoints
app.get("/api/rates", (req, res) => {
  const rate = process.env.CHAMAPAY_RATE || "132"; // Fallback to 132 if not set
  res.status(200).json({
    rate: parseFloat(rate),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

export default app;
