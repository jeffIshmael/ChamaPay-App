import { Router } from "express";
import authenticate from "../Middlewares/authMiddleware";
import {
  createKycSession,
  diditKycWebhook,
  getKycJob,
  getKycStatus,
  reportClientKycResult,
  sandboxApproveKyc,
  sendKycPhoneOtp,
  verifyKycPhoneOtp,
} from "../Controllers/kycController";
import { getManualStatus, getManualChallenge, kycUpload, submitManualKyc , adminKycDecision
  ,requireKycAdmin, adminKycQueue, adminKycDetail
} from "../Controllers/kycManualController";

const kycRoutes = Router();

/** Didit provider callback — no user JWT */
kycRoutes.post("/webhook", diditKycWebhook as any);

kycRoutes.get("/status", authenticate, getKycStatus as any);
kycRoutes.post("/session", authenticate, createKycSession as any);
kycRoutes.get("/jobs/:jobId", authenticate, getKycJob as any);
kycRoutes.post("/jobs/:jobId/client-result", authenticate, reportClientKycResult as any);
kycRoutes.post("/sandbox/approve", authenticate, sandboxApproveKyc as any);
kycRoutes.post("/send-phone-otp", authenticate, sendKycPhoneOtp as any);
kycRoutes.post("/verify-phone-otp", authenticate, verifyKycPhoneOtp as any);
kycRoutes.get("/manual/challenge", authenticate, getManualChallenge);
kycRoutes.get("/manual/status", authenticate, getManualStatus);
kycRoutes.post("/manual/submit", authenticate, kycUpload, submitManualKyc);
kycRoutes.get("/admin/kyc/queue", authenticate, requireKycAdmin, adminKycQueue);
kycRoutes.get("/admin/kyc/:id", authenticate, requireKycAdmin, adminKycDetail);
kycRoutes.post("/admin/kyc/:id/decision", authenticate, requireKycAdmin, adminKycDecision);

export default kycRoutes;
