// Routes for authentication i.e login & signup
import express, { Router } from "express";
import {
    getMnemonic,
    googleAuth,
    login,
    requestRegistration,
    resendOTP,
    sendWhatsAppCode,
    verifyEmailAndCompleteRegistration,
    thirdwebAuth
} from "../Controllers/authController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Registration endpoints
router.post("/request-registration", requestRegistration);
router.post("/verify-email", verifyEmailAndCompleteRegistration);
router.post("/resend-otp", resendOTP);
router.post("/send-whatsapp-otp", sendWhatsAppCode);

// Login endpoint
router.post("/login", login);

// Google auth endpoint
router.post("/google", googleAuth);

// thirweb auth
router.post("/thirdweb", thirdwebAuth);


// Protected endpoints
router.post("/get-mnemonic", authenticate, getMnemonic);

export default router; 