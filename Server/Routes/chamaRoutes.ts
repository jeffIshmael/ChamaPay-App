// Routes for chama related functions
import express, { Router } from "express";
import {
    addMemberToChama,
    createChama,
    depositToChama,
    getChamaBySlug,
    getChamasUserIsMemberOf,
    getPublicChamasUserIsNotMemberOf,
    markMessagesRead,
    sendChamaMessage
} from "../Controllers/chamaControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// post routes
// create a chama
router.post("/create", authenticate, createChama);


// get routes
// get chamas user is a member of
router.get("/my-chamas", authenticate, getChamasUserIsMemberOf);

// get public chamas user is not member of
router.get("/public-chamas", authenticate, getPublicChamasUserIsNotMemberOf);



// deposit funds to a chama
router.post("/deposit", authenticate, depositToChama);

// add a member to a chama
router.post("/add-member", authenticate, addMemberToChama);

// add a chama message
router.post("/send-message", authenticate, sendChamaMessage);
router.post("/mark-messages-read", authenticate, markMessagesRead);

// get chama by slug
router.get("/:slug", authenticate, getChamaBySlug);

export default router; 