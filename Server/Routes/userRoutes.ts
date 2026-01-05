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
    checkHasJoinRequest,
    shareChamaLink
} from "../Controllers/userController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Post functions
router.post("/checkUserExists", checkUserExists);
router.post("/checkUsernameAvailability", checkUsernameAvailability);
router.post("/registerPayment", authenticate, registerPayment);
router.post("/confirmRequest", authenticate, confirmJoinRequest);
router.post("/shareLink", authenticate, confirmJoinRequest);


// get routes functions
router.get("/", authenticate, getUser);
router.get("/details", authenticate, getUserDetails);
router.get("/hasRequest", authenticate, checkHasJoinRequest);
router.put("/profile", authenticate, updateUserProfile);
router.get("/search", searchUsers);

// with params
router.get("/:userId", authenticate, getUserById);
router.get("/:userId/joinRequest", sendJoinRequest);

export default router; 