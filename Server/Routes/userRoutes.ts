// This file has routes for user operations
import express, { Router } from "express";
import {
    getUser,
    updateUserProfile,
    checkUserExists,
    getUserById,
} from "../Controllers/userController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Get functions
router.post("/checkUserExists", checkUserExists);
router.get("/", authenticate, getUser);
// router.get("/payments", authenticate, getUserPayments);
// router.get("/notifications", authenticate, getUserNotifications);

// Update functions
router.put("/profile", authenticate, updateUserProfile);

// Get functions
router.get("/:userId", authenticate, getUserById);

export default router; 