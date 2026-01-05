// This file has routes for user operations
import express, { Router } from "express";
import {
    checkUserExists,
    checkUsernameAvailability,
    getUser,
    getUserById,
    searchUsers,
    updateUserProfile,
    getUserDetails,
    registerPayment,
    sendJoinRequest,
    confirmJoinRequest,
    checkHasJoinRequest
} from "../Controllers/userController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Public functions
router.post("/checkUserExists", checkUserExists);
router.post("/checkUsernameAvailability", checkUsernameAvailability);
router.get("/search", searchUsers);
router.post("/registerPayment", authenticate, registerPayment);
router.post("/joinRequest", authenticate, sendJoinRequest);
router.post("/confirmRequest", authenticate, confirmJoinRequest);


// Authenticated functions
router.get("/", authenticate, getUser);
router.get("/details", authenticate, getUserDetails);
router.get("/hasRequest", authenticate, checkHasJoinRequest);
router.put("/profile", authenticate, updateUserProfile);
router.get("/:userId", authenticate, getUserById);

export default router; 