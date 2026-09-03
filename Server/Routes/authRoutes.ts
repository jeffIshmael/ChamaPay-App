// Routes for authentication i.e login & signup
import express, { Router } from "express";
import {
    miniappLogin,
    miniappRegister,
    oauthAuthenticate,
    refreshToken,
    registerUser,
    sendVerificationCode,
    sendWhatsAppCode,
    verifyEmailCode,
    verifyWhatsAppCode
} from "../Controllers/authController";

const router: Router = express.Router();

// Phone + WhatsApp OTP
router.post("/send-whatsapp-otp", sendWhatsAppCode);
router.post("/verify-whatsapp-otp", verifyWhatsAppCode);

// Email verification flow
router.post("/send-code", sendVerificationCode);
router.post("/verify-code", verifyEmailCode);


// Authenticate existing user and get tokens
router.post("/authenticate", oauthAuthenticate);

// Register user with username and wallet address
router.post("/register", registerUser);

// Refresh access token using refresh token
router.post("/refresh", refreshToken);

// Miniapp Auth routes
router.post("/miniapp/login", miniappLogin);
router.post("/miniapp/register", miniappRegister);




export default router;
