import express, { Router } from "express";
import { depositToMoonwell } from "../Controllers/moonwellController";
import authenticate from "../Middlewares/authMiddleware";

const moonwellRoutes: Router = express.Router();

moonwellRoutes.post("/deposit", authenticate, depositToMoonwell as any);

export default moonwellRoutes;
