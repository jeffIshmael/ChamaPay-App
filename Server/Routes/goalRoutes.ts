import { Router, Request } from "express";
import multer from "multer";
import {
  addGoalMember,
  contributeToGoal,
  createGoal,
  getGoalBySlug,
  getGoalPayStatus,
  getMyGoals,
  getPublicGoalByPayToken,
  initiateGoalPayOnramp,
  setGoalYieldEnabled,
  uploadGoalCover,
  withdrawFromGoal,
} from "../Controllers/goalControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post("/create", authenticate, createGoal);
router.get("/my-goals", authenticate, getMyGoals);
router.get("/slug/:slug", authenticate, getGoalBySlug);

/** Public guest pay-link (obfuscated token) */
router.get("/pay/status/:code", getGoalPayStatus);
router.get("/pay/:token", getPublicGoalByPayToken);
router.post("/pay/:token/onramp", initiateGoalPayOnramp);

router.post(
  "/:id/cover",
  authenticate,
  upload.single("image"),
  uploadGoalCover
);
router.post("/:id/yield", authenticate, setGoalYieldEnabled);
router.post("/:id/members", authenticate, addGoalMember);
router.post("/:id/withdraw", authenticate, withdrawFromGoal);
router.post("/:id/contribute", authenticate, contributeToGoal);

export default router;
