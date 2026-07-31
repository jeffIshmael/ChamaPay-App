// Routes for chama related functions
import express, { Router } from "express";
import {
    addMemberToChama,
    createChama,
    depositToChama,
    getChamaBySlug,
    getChamasUserIsMemberOf,
    markMessagesRead,
    sendChamaMessage,
    withdrawFromChamaBalance,
    adminSetPayoutOrder,
    getChamaMessages,
    getChamaPayments,
    getChamaPayouts,
    updateChamaDetailsController
} from "../Controllers/chamaControllers";
import { miniappCheckHasJoinRequest, miniappGetChamaBySlug, miniappGetPendingRequests } from "../Controllers/miniappController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// post routes
// create a chama
router.post("/create", authenticate, createChama);

// set payout order
router.post("/set-payout-order", authenticate, adminSetPayoutOrder);


// get routes
// get chamas user is a member of
router.get("/my-chamas", authenticate, getChamasUserIsMemberOf);




// deposit funds to a chama
router.post("/deposit", authenticate, depositToChama);

// add a member to a chama
router.post("/add-member", authenticate, addMemberToChama);


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
router.put("/:chamaId/details", authenticate, updateChamaDetailsController);
router.get("/:chamaId/messages", authenticate, getChamaMessages);
router.get("/:chamaId/payments", authenticate, getChamaPayments);
router.get("/:chamaId/payouts", authenticate, getChamaPayouts);

export default router; 