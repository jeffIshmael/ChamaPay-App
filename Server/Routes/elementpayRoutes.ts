// Routes for chama related functions
import express, { Router } from "express";
import { getElementPayQuote, initiateElementPayOnramp, initiateElementPayOfframp, elementPayWebhook } from "../Controllers/elementpayControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

router.post("/quote", authenticate, getElementPayQuote);
router.post("/onramp", authenticate, initiateElementPayOnramp);
router.post("/offramp", authenticate, initiateElementPayOfframp);
router.post("/webhook", elementPayWebhook);

export default router; 

