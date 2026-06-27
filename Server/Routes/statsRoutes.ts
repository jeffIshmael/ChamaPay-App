import express, { Router } from "express";
import { getStats } from "../Controllers/statsController";

const router: Router = express.Router();

router.get("/", getStats);

export default router;
