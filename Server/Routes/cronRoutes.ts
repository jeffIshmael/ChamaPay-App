import express, { Router } from "express";
import { cronStartController , cronPayoutController} from "../Controllers/CronController";

const router: Router = express.Router();

router.post("/run/start", cronStartController);
router.post("/run/payout", cronPayoutController);


export default router;