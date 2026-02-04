import cors from "cors";
import dotenv from "dotenv";
import express, { Application } from "express";
import authRoutes from "./Routes/authRoutes";
import chamaRoutes from "./Routes/chamaRoutes";
import cronRoutes from "./Routes/cronRoutes";
import pretiumRoutes from "./Routes/pretiumRoutes";
import userRoutes from "./Routes/userRoutes";
import webhookRoutes from "./Routes/webhookRoutes";

// Load environment variables
dotenv.config();

// Create Express application
const app: Application = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/auth", authRoutes); // All auth-related routes (e.g., /auth/register, /auth/login)
app.use("/user", userRoutes); // All user-related routes
app.use("/chama", chamaRoutes); // All chama-related routes
app.use("/cron", cronRoutes);
app.use("/pretium", pretiumRoutes);
app.use("/webhooks", webhookRoutes); // Webhook routes for external services

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
