// This file has routes for user operations
import express, { Router } from "express";
import {
    getUser,
    updateUserProfile,
} from "../Controllers/userController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Get functions
router.get("/", authenticate, getUser);
// router.get("/payments", authenticate, getUserPayments);
// router.get("/notifications", authenticate, getUserNotifications);

// Update functions
router.put("/profile", authenticate, updateUserProfile);

export default router; 