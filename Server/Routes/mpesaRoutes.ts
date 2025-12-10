// This file has routes for user operations
import express, { Router } from "express";
import {
  mpesaTransaction,
  mpesaCallback,
  checkPaymentStatus,
  getUserTransactions,
} from "../Controllers/mpesaControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Public functions
router.post("/", authenticate, mpesaTransaction);

// M-Pesa callback (public - no auth needed)
router.post("/callback", mpesaCallback);
// Get user transaction history (protected)
router.get("/transactions", authenticate, getUserTransactions);

// Check payment status (protected route)
router.get("/status/:checkoutRequestID", authenticate, checkPaymentStatus);

export default router;
