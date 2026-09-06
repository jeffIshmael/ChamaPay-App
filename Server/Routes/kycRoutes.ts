import { Router } from "express";
import authenticate from "../Middlewares/authMiddleware";
import {
  createKycSession,
  diditKycWebhook,
  getKycJob,
  getKycStatus,
  reportClientKycResult,
  sandboxApproveKyc,
} from "../Controllers/kycController";

const kycRoutes = Router();

/** Didit provider callback — no user JWT */
kycRoutes.post("/webhook", diditKycWebhook as any);

kycRoutes.get("/status", authenticate, getKycStatus as any);
kycRoutes.post("/session", authenticate, createKycSession as any);
kycRoutes.get("/jobs/:jobId", authenticate, getKycJob as any);
kycRoutes.post("/jobs/:jobId/client-result", authenticate, reportClientKycResult as any);
kycRoutes.post("/sandbox/approve", authenticate, sandboxApproveKyc as any);

export default kycRoutes;
