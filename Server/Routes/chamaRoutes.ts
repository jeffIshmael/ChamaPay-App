// Routes for chama related functions
import express, { Router } from "express";
import {
    createChama
} from "../Controllers/chamaControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// create a chama
router.post("/create", authenticate, createChama);

export default router; 