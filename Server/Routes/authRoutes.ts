// Routes for authentication i.e login & signup
import express, { Router } from "express";
import {
    refreshToken,
    registerUser,
    sendWhatsAppCode,
    oauthAuthenticate,
    verifyEmailCode,
    sendVerificationCode
} from "../Controllers/authController";

const router: Router = express.Router();

// Registration endpoints
router.post("/send-whatsapp-otp", sendWhatsAppCode);

// Email verification flow
router.post("/send-code", sendVerificationCode);
router.post("/verify-code", verifyEmailCode);


// Authenticate existing user and get tokens
router.post("/authenticate", oauthAuthenticate);

// Register user with username and wallet address
router.post("/register", registerUser);

// Refresh access token using refresh token
router.post("/refresh", refreshToken);




export default router; 