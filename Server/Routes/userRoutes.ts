// This file has routes for user operations
import express, { Request, Router } from "express";
import multer from "multer";
import {
  checkHasJoinRequest,
  checkUserExists,
  checkUsernameAvailability,
  confirmJoinRequest,
  getUser,
  getUserByAddress,
  getUserById,
  getUserDetails,
  getUserUsdcBalance,
  markNotificationsRead,
  registerPayment,
  searchUsers,
  sendJoinRequest,
  shareChamaLink,
  transferUSDC,
  updatePhoneNumber,
  updateUserNotificationSettings,
  updateUserPushToken,
  uploadProfileImage
} from "../Controllers/userController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Post functions
router.post("/checkUserExists", checkUserExists);
router.post("/checkUsernameAvailability", checkUsernameAvailability);
router.post("/registerPayment", authenticate, registerPayment);
router.post("/confirmRequest", authenticate, confirmJoinRequest);
router.post("/shareLink", authenticate, shareChamaLink);
router.post("/sendUSDC", authenticate, transferUSDC);
router.post('/profile/image', authenticate, upload.single('image'), uploadProfileImage);
router.post("/updatePushToken", authenticate, updateUserPushToken);
router.post("/updateNotificationSettings", authenticate, updateUserNotificationSettings);
router.post("/notifications/mark-read", authenticate, markNotificationsRead);


// get routes functions
router.get("/", authenticate, getUser);
router.get("/details", authenticate, getUserDetails);
router.get("/hasRequest", authenticate, checkHasJoinRequest);
// router.put("/profile", authenticate, updateUserProfile);
router.get("/search", searchUsers);
router.get("/balance", authenticate, getUserUsdcBalance);
router.get("/joinRequest", authenticate, sendJoinRequest);
router.get("/by-address", getUserByAddress);

// put routes
router.put("/profile", authenticate, updatePhoneNumber);

// with params
router.get("/:userId", authenticate, getUserById);


export default router; 