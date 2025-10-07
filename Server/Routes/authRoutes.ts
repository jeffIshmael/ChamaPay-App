// Routes for authentication i.e login & signup
import express, { Router } from "express";
import {
    sendWhatsAppCode,
    thirdwebAuth
} from "../Controllers/authController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Registration endpoints
router.post("/send-whatsapp-otp", sendWhatsAppCode);



// thirweb auth
router.post("/thirdweb", thirdwebAuth);



export default router; 