import { Router } from "express";
import { createGoal, getGoalBySlug, getMyGoals } from "../Controllers/goalControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = Router();

router.post("/create", authenticate, createGoal);
router.get("/my-goals", authenticate, getMyGoals);
router.get("/slug/:slug", authenticate, getGoalBySlug);

export default router;
