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
kycRoutes.get("/manual/challenge", authenticate, getManualChallenge as any);
kycRoutes.get("/manual/status", authenticate, getManualStatus as any);
kycRoutes.post("/manual/submit", authenticate, kycUpload, submitManualKyc as any);
kycRoutes.get("/admin/kyc/queue", authenticate, requireKycAdmin, adminKycQueue as any);
kycRoutes.get("/admin/kyc/:id", authenticate, requireKycAdmin, adminKycDetail as any);
kycRoutes.post("/admin/kyc/:id/decision", authenticate, requireKycAdmin, adminKycDecision as any);

export default kycRoutes;
