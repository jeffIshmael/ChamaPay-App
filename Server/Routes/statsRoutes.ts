import { Router } from "express";
import { getStats, getOnchainStats, getUnseenOutcomes, markOutcomeSeen } from "../Controllers/statsController";
import authenticate from "../Middlewares/authMiddleware";

const router = Router();

router.get("/", getStats);
router.get("/onchain", getOnchainStats);
router.get("/unseen-outcomes", authenticate, getUnseenOutcomes);
router.post("/outcome/:id/seen", authenticate, markOutcomeSeen);

export default router;
