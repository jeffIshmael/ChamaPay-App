// Routes for authentication i.e login & signup
import express, { Router } from "express";
import {
    getMnemonic,
    login,
    requestRegistration,
    resendOTP,
    verifyEmailAndCompleteRegistration
} from "../Controllers/authController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Registration endpoints
router.post("/request-registration", requestRegistration);
router.post("/verify-email", verifyEmailAndCompleteRegistration);
router.post("/resend-otp", resendOTP);

// Login endpoint
router.post("/login", login);

// Protected endpoints
router.post("/get-mnemonic", authenticate, getMnemonic);

export default router; 