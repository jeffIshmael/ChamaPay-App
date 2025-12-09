// This file has routes for user operations
import express, { Router } from "express";
import {
    mpesaTransaction, mpesaCallback, checkPaymentStatus
} from "../Controllers/mpesaControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Public functions
router.post("/",authenticate, mpesaTransaction);

// M-Pesa callback (public - no auth needed)
router.post("/mpesa/callback", mpesaCallback);

// Check payment status (protected route)
router.get("/mpesa/status/:checkoutRequestID", authenticate, checkPaymentStatus);

export default router; 