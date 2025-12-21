// This file has routes for user operations
import express, { Router } from "express";
import {
  initiatePretiumOfframp,
  initiatePretiumOnramp,
  getExchangeRate,
  pretiumVerifyNumber,
  pretiumCallback,
} from "../Controllers/pretiumControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// M-Pesa callback
router.post("/callback", pretiumCallback);
// onramping route
router.post("/onramp", authenticate, initiatePretiumOnramp);
// Get user transaction history (protected)
router.post("/offramp", authenticate, initiatePretiumOfframp);

// validate phoneno
router.get("/verify", pretiumVerifyNumber);
// get the quote
router.get("/quote/:currencyCode", getExchangeRate);

export default router;
