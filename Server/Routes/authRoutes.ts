// Routes for authentication i.e login & signup
import express, { Router } from "express";
import {
    googleAuthComplete,
    refreshToken,
    registerUser,
    sendWhatsAppCode,
    thirdwebAuth
} from "../Controllers/authController";

const router: Router = express.Router();

// Registration endpoints
router.post("/send-whatsapp-otp", sendWhatsAppCode);



// thirweb auth
router.post("/thirdweb", thirdwebAuth);

// Authenticate existing user and get tokens
router.post("/authenticate", googleAuthComplete);

// Register user with username and wallet address
router.post("/register", registerUser);

// Refresh access token using refresh token
router.post("/refresh", refreshToken);

export default router; 