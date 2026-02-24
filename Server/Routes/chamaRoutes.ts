// Routes for chama related functions
import express, { Router } from "express";
import {
    addLockedAmount,
    addMemberToChama,
    createChama,
    depositToChama,
    getChamaBySlug,
    getChamasUserIsMemberOf,
    getPublicChamasUserIsNotMemberOf,
    markMessagesRead,
    sendChamaMessage,
    withdrawFromChamaBalance
} from "../Controllers/chamaControllers";
import { miniappCheckHasJoinRequest, miniappGetChamaBySlug, miniappGetPendingRequests } from "../Controllers/miniappController";
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

// add locked funds to a chama
router.post("/add-locked-amount", authenticate, addLockedAmount);

// withdraw from a chama balance
router.post("/withdraw", authenticate, withdrawFromChamaBalance);

// add a chama message
router.post("/send-message", authenticate, sendChamaMessage);
router.post("/mark-messages-read", authenticate, markMessagesRead);

router.get("/pending-requests/:userId", miniappGetPendingRequests);
router.get("/check-request/:address/:chamaId", miniappCheckHasJoinRequest);
router.get("/slug/:slug", miniappGetChamaBySlug);

// get chama by slug
router.get("/:slug", authenticate, getChamaBySlug);

export default router; 