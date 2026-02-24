import express, { Router } from "express";
import {
    getChamasUserIsMemberOf,
    getPublicChamasUserIsNotMemberOf,
} from "../Controllers/chamaControllers";
import {
    miniappConfirmJoinRequest,
    miniappCreateChama,
    miniappJoinChama,
} from "../Controllers/miniappController";
import {
    getUserDetails,
    registerPayment,
    sendJoinRequest,
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
router.post("/send-request", sendJoinRequest);
router.post("/confirm-request", miniappConfirmJoinRequest);

// User & Payments
router.get("/user-details", getUserDetails);
router.post("/register-payment", registerPayment);

export default router;
