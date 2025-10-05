// Routes for chama related functions
import express, { Router } from "express";
import {
    getTheQuote,
    approveSwap,
    executeSwap    
} from "../Controllers/mentoControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// post routes
// approve a swap
router.post("/approve-swap", authenticate, approveSwap);

// execute a swap
router.post("/execute-swap", authenticate, executeSwap);

// get routes
// get a quote
router.get("/get-quote", authenticate, getTheQuote);


export default router; 