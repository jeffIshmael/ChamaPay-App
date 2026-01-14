// This file has routes for user operations
import express, { Router } from "express";
import {
  initiatePretiumOfframp,
  initiatePretiumOnramp,
  getExchangeRate,
  pretiumVerifyNumber,
  pretiumCallback,
  pretiumCheckTransaction,
  pretiumCheckTriggerDepositFor,
  pretiumCheckNgnBankDetails,
  pretiumCheckMobileNoDetails
} from "../Controllers/pretiumControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// M-Pesa callback
router.post("/callback", pretiumCallback);
// onramping route
router.post("/onramp", authenticate, initiatePretiumOnramp);
// Get user transaction history (protected)
router.post("/offramp", authenticate, initiatePretiumOfframp);
// check trnsaction status
router.post("/transactionStatus",authenticate, pretiumCheckTransaction);
// trigger deposit for
router.post("/agentDeposit",authenticate, pretiumCheckTriggerDepositFor);
// verify ngn bank details
router.post("/validate/ngnBank",authenticate, pretiumCheckNgnBankDetails);
// verify mobile network details
router.post("/verify/mobileNetwork",authenticate, pretiumCheckMobileNoDetails);

// validate phoneno
router.get("/verify", pretiumVerifyNumber);
// get the quote
router.get("/quote/:currencyCode", getExchangeRate);

export default router;
