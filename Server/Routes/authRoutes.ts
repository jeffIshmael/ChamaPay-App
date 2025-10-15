// Routes for authentication i.e login & signup
import express, { Router } from "express";
import {
    googleAuthComplete,
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

export default router; 