import { Router } from "express";
import { getStats, getOnchainStats } from "../Controllers/statsController";

const router = Router();

router.get("/", getStats);
router.get("/onchain", getOnchainStats);

export default router;
