import express, { Router } from "express";
import {
    getChamasUserIsMemberOf,
    getPublicChamasUserIsNotMemberOf,
} from "../Controllers/chamaControllers";
import {
    miniappConfirmJoinRequest,
    miniappCreateChama,
    miniappGetChamaBySlug,
    miniappGetMessages,
    miniappGetRecentPayments,
    miniappGetUserDetails,
    miniappGetUserNotifications,
    miniappJoinChama,
    miniappRegisterChamaPayment,
    miniappSendJoinRequest,
    miniappSendMessage
} from "../Controllers/miniappController";
import {
    registerPayment,
} from "../Controllers/userController";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Apply auth middleware to all miniapp routes
router.use(authenticate);

// Chama management
router.get("/user-chamas", getChamasUserIsMemberOf);
router.get("/public-chamas", getPublicChamasUserIsNotMemberOf);
router.post("/create-chama", miniappCreateChama);
router.post("/join-chama", miniappJoinChama);

// Request management
router.post("/send-request", miniappSendJoinRequest);
router.post("/confirm-request", miniappConfirmJoinRequest);

// User & Payments
router.get("/user-details", miniappGetUserDetails);
router.get("/notifications/:userId", miniappGetUserNotifications);
router.get("/payments/:userId", miniappGetRecentPayments);
router.post("/register-payment", registerPayment);
router.post("/register-chama-payment", miniappRegisterChamaPayment);

// Chama Details
router.get("/chama/slug/:slug", miniappGetChamaBySlug);

// Chat
router.get("/chama/:chamaId/messages", miniappGetMessages);
router.post("/chama/send-message", miniappSendMessage);

export default router;
