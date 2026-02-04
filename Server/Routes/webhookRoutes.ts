import express from "express";
import { handleAlchemyWebhook } from "../Controllers/webhookController";

const router = express.Router();

// Alchemy webhook endpoint for USDC transfer notifications
router.post("/alchemy", handleAlchemyWebhook);

export default router;
