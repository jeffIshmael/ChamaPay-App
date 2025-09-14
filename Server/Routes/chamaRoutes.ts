// Routes for chama related functions
import express, { Router } from "express";
import {
    createChama,
    getChamaBySlug,
    getChamasUserIsMemberOf,
    getPublicChamasUserIsNotMemberOf
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

// get chama by slug
router.get("/:slug", authenticate, getChamaBySlug);

export default router; 