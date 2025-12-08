// This file has routes for user operations
import express, { Router } from "express";
import {
    mpesaTransaction
} from "../Controllers/mpesaControllers";
import authenticate from "../Middlewares/authMiddleware";

const router: Router = express.Router();

// Public functions
router.post("/",authenticate, mpesaTransaction);
;


export default router; 