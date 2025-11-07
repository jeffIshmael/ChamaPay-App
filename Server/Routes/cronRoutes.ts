import express, { Router } from "express";
import { cronController } from "../Controllers/CronController";

const router: Router = express.Router();

router.post("/run", cronController);

export default router;