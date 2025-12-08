import cors from "cors";
import dotenv from "dotenv";
import express, { Application } from "express";
import authRoutes from "./Routes/authRoutes";
import userRoutes from "./Routes/userRoutes";
import chamaRoutes from "./Routes/chamaRoutes";
import mentoRoutes from "./Routes/mentoRoutes";
import cronRoutes from "./Routes/cronRoutes";
import mpesaRoutes from "./Routes/mpesaRoutes";

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
app.use("/mpesa", mpesaRoutes);
app.use("/mento", mentoRoutes);
app.use("/cron", cronRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.originalUrl
  });
});

export default app; 