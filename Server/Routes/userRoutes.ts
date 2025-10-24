// This file has routes for user operations
import express, { Router } from "express";
import {
    checkUserExists,
    checkUsernameAvailability,
    getUser,
    getUserById,
    searchUsers,
    updateUserProfile,
} from "../Controllers/userController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Public functions
router.post("/checkUserExists", checkUserExists);
router.post("/checkUsernameAvailability", checkUsernameAvailability);
router.get("/search", searchUsers);

// Authenticated functions
router.get("/", authenticate, getUser);
router.put("/profile", authenticate, updateUserProfile);
router.get("/:userId", authenticate, getUserById);

export default router; 