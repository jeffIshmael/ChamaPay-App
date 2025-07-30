const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");


dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use("/auth", authRoutes); // All auth-related routes (e.g., /auth/register, /auth/login)
app.use("/user", userRoutes); //all user-related routes



module.exports = app;