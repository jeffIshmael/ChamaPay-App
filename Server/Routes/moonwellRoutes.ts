import express, { Router } from "express";
import { depositToMoonwell, withdrawFromMoonwell, getMoonwellYields } from "../Controllers/moonwellController";
import authenticate from "../Middlewares/authMiddleware";

const moonwellRoutes: Router = express.Router();

moonwellRoutes.post("/deposit", authenticate, depositToMoonwell as any);
moonwellRoutes.post("/withdraw", authenticate, withdrawFromMoonwell as any);
moonwellRoutes.get("/yields", authenticate, getMoonwellYields as any);

export default moonwellRoutes;
