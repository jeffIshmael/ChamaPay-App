import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import {
  getMonthToDateOnrampKes,
  getTier1MonthlyKes,
  getTier2MonthlyKes,
  resolveMonthlyLimit,
} from "../Lib/kycService";

const prisma = new PrismaClient();

export const ALLOWED_DOCUMENT_TYPES = [
  "NATIONAL_ID",
  "PASSPORT",
  "DRIVERS_LICENSE",
] as const;

export type SmileDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

const isSandbox = () => process.env.SMILE_SANDBOX === "true";

function makeJobId(userId: number): string {
  return `cp_${userId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * GET /kyc/status — current tier, monthly usage, remaining headroom.
 */
export async function getKycStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycTier: true,
        kycStatus: true,
        kycVerifiedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const kycTier = user.kycTier ?? 1;
    const limitKes = resolveMonthlyLimit(kycTier);
    const mtdKes = await getMonthToDateOnrampKes(userId);
    const remainingKes = Math.max(0, limitKes - mtdKes);

    const latestJob = await prisma.kycJob.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      kycTier,
      kycStatus: user.kycStatus,
      kycVerifiedAt: user.kycVerifiedAt,
      limitKes,
      mtdKes,
      remainingKes,
      tier1LimitKes: getTier1MonthlyKes(),
      tier2LimitKes: getTier2MonthlyKes(),
      sandbox: isSandbox(),
      latestJob: latestJob
        ? {
            jobId: latestJob.jobId,
            documentType: latestJob.documentType,
            status: latestJob.status,
            createdAt: latestJob.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("getKycStatus error:", error);
    return res.status(500).json({ success: false, error: "Failed to load KYC status" });
  }
}

/**
 * POST /kyc/session — start a Smile (or sandbox) verification job.
 * Body: { documentType: NATIONAL_ID | PASSPORT | DRIVERS_LICENSE }
 */
export async function createKycSession(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const documentType = String(req.body?.documentType || "").toUpperCase();
    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType as SmileDocumentType)) {
      return res.status(400).json({
        success: false,
        error: "documentType must be NATIONAL_ID, PASSPORT, or DRIVERS_LICENSE",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycTier: true, kycStatus: true },
    });

    if (user && user.kycTier >= 2 && user.kycStatus === "approved") {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: "Identity already verified",
        kycTier: user.kycTier,
      });
    }

    const jobId = makeJobId(userId);
    const partnerId = process.env.SMILE_PARTNER_ID || "";
    const callbackUrl =
      process.env.SMILE_CALLBACK_URL ||
      `${process.env.APP_URL || ""}/kyc/webhook`;

    await prisma.kycJob.create({
      data: {
        userId,
        provider: "smile",
        jobId,
        documentType,
        status: "pending",
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: "pending" },
    });

    return res.status(200).json({
      success: true,
      jobId,
      documentType,
      countryCode: "KE",
      partnerId,
      callbackUrl,
      sandbox: isSandbox(),
      /** Params for Smile Expo DocumentVerificationView */
      smileParams: {
        userId: String(userId),
        jobId,
        countryCode: "KE",
        documentType,
        captureBothSides: documentType === "NATIONAL_ID" || documentType === "DRIVERS_LICENSE",
        allowNewEnroll: true,
        showInstructions: true,
        showAttribution: true,
        allowGalleryUpload: false,
        skipApiSubmission: false,
      },
    });
  } catch (error) {
    console.error("createKycSession error:", error);
    return res.status(500).json({ success: false, error: "Failed to create KYC session" });
  }
}

/**
 * POST /kyc/jobs/:jobId/client-result
 * Mobile reports SDK completion; limit upgrade still waits for webhook (or sandbox approve).
 */
export async function reportClientKycResult(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { jobId } = req.params;
    if (!userId || !jobId) {
      return res.status(400).json({ success: false, error: "Missing user or jobId" });
    }

    const job = await prisma.kycJob.findFirst({
      where: { jobId, userId },
    });

    if (!job) {
      return res.status(404).json({ success: false, error: "KYC job not found" });
    }

    if (job.status === "approved" || job.status === "rejected") {
      return res.status(200).json({ success: true, status: job.status });
    }

    await prisma.kycJob.update({
      where: { id: job.id },
      data: {
        status: "processing",
        rawResultRef: req.body?.resultRef
          ? String(req.body.resultRef).slice(0, 500)
          : job.rawResultRef,
      },
    });

    return res.status(200).json({
      success: true,
      status: "processing",
      message: "Awaiting provider confirmation",
      sandbox: isSandbox(),
    });
  } catch (error) {
    console.error("reportClientKycResult error:", error);
    return res.status(500).json({ success: false, error: "Failed to record KYC result" });
  }
}

async function applyJobDecision(
  jobId: string,
  decision: "approved" | "rejected",
  rawResultRef?: string
) {
  const job = await prisma.kycJob.findUnique({ where: { jobId } });
  if (!job) return null;

  await prisma.kycJob.update({
    where: { id: job.id },
    data: {
      status: decision,
      rawResultRef: rawResultRef ?? job.rawResultRef,
    },
  });

  if (decision === "approved") {
    await prisma.user.update({
      where: { id: job.userId },
      data: {
        kycTier: 2,
        kycStatus: "approved",
        kycVerifiedAt: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: job.userId },
      data: { kycStatus: "rejected" },
    });
  }

  return job;
}

/**
 * Verify Smile webhook authenticity when a secret is configured.
 * Smile may send HMAC in headers; we also accept a shared secret query/body token in sandbox.
 */
function verifySmileWebhook(req: Request): boolean {
  const secret = process.env.SMILE_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — accept but log (common during early sandbox)
    if (!isSandbox()) {
      console.warn("[KYC] SMILE_WEBHOOK_SECRET unset; accepting webhook without signature check");
    }
    return true;
  }

  const headerSig =
    (req.headers["x-smile-signature"] as string) ||
    (req.headers["x-signature"] as string) ||
    "";
  const bodyToken = String(req.body?.webhook_secret || req.query?.secret || "");

  if (bodyToken && bodyToken === secret) return true;

  if (headerSig) {
    const raw = (req as any).rawBody || JSON.stringify(req.body || {});
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(headerSig),
        Buffer.from(expected)
      );
    } catch {
      return headerSig === expected || headerSig === `sha256=${expected}`;
    }
  }

  return false;
}

/**
 * Map Smile job result codes to approved / rejected.
 * Smile historically uses ResultCode / Actions / job_complete payloads.
 */
function parseSmileDecision(body: any): "approved" | "rejected" | "pending" {
  const code = String(
    body?.ResultCode ?? body?.result_code ?? body?.code ?? ""
  );
  const successFlag = body?.success ?? body?.job_success;
  const action =
    body?.Actions?.Verify_Document ||
    body?.Actions?.Document_Check ||
    body?.actions?.document_check;

  if (
    successFlag === true ||
    code === "0810" ||
    code === "0820" ||
    String(action).toLowerCase() === "passed" ||
    String(body?.status).toLowerCase() === "approved"
  ) {
    return "approved";
  }

  if (
    successFlag === false ||
    String(body?.status).toLowerCase() === "rejected" ||
    String(action).toLowerCase() === "failed" ||
    code.startsWith("09")
  ) {
    return "rejected";
  }

  return "pending";
}

/**
 * POST /kyc/webhook — Smile callback (no user auth; signature checked).
 */
export async function smileKycWebhook(req: Request, res: Response) {
  try {
    if (!verifySmileWebhook(req)) {
      return res.status(401).json({ success: false, error: "Invalid webhook signature" });
    }

    const body = req.body || {};
    const jobId = String(
      body?.PartnerParams?.job_id ||
        body?.partner_params?.job_id ||
        body?.job_id ||
        body?.jobId ||
        ""
    );

    if (!jobId) {
      console.warn("[KYC] webhook missing job_id", JSON.stringify(body).slice(0, 400));
      return res.status(400).json({ success: false, error: "Missing job_id" });
    }

    const decision = parseSmileDecision(body);
    if (decision === "pending") {
      await prisma.kycJob.updateMany({
        where: { jobId },
        data: {
          status: "processing",
          rawResultRef: JSON.stringify(body).slice(0, 2000),
        },
      });
      return res.status(200).json({ success: true, status: "processing" });
    }

    const job = await applyJobDecision(
      jobId,
      decision,
      JSON.stringify(body).slice(0, 2000)
    );

    if (!job) {
      return res.status(404).json({ success: false, error: "Unknown job_id" });
    }

    console.log(`[KYC] job ${jobId} → ${decision} (user ${job.userId})`);
    return res.status(200).json({ success: true, status: decision });
  } catch (error) {
    console.error("smileKycWebhook error:", error);
    return res.status(500).json({ success: false, error: "Webhook processing failed" });
  }
}

/**
 * POST /kyc/sandbox/approve — only when SMILE_SANDBOX=true.
 * Body: { jobId }
 */
export async function sandboxApproveKyc(req: Request, res: Response) {
  try {
    if (!isSandbox()) {
      return res.status(403).json({ success: false, error: "Sandbox approvals disabled" });
    }

    const userId = req.user?.userId;
    const jobId = String(req.body?.jobId || "");
    if (!userId || !jobId) {
      return res.status(400).json({ success: false, error: "jobId required" });
    }

    const job = await prisma.kycJob.findFirst({ where: { jobId, userId } });
    if (!job) {
      return res.status(404).json({ success: false, error: "KYC job not found" });
    }

    await applyJobDecision(jobId, "approved", "sandbox_approve");
    return res.status(200).json({
      success: true,
      status: "approved",
      kycTier: 2,
      limitKes: getTier2MonthlyKes(),
      message: "Sandbox identity verification approved",
    });
  } catch (error) {
    console.error("sandboxApproveKyc error:", error);
    return res.status(500).json({ success: false, error: "Sandbox approve failed" });
  }
}

/**
 * GET /kyc/jobs/:jobId — poll job status after capture.
 */
export async function getKycJob(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { jobId } = req.params;
    if (!userId || !jobId) {
      return res.status(400).json({ success: false, error: "Missing jobId" });
    }

    const job = await prisma.kycJob.findFirst({ where: { jobId, userId } });
    if (!job) {
      return res.status(404).json({ success: false, error: "KYC job not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycTier: true, kycStatus: true },
    });

    return res.status(200).json({
      success: true,
      jobId: job.jobId,
      documentType: job.documentType,
      status: job.status,
      kycTier: user?.kycTier ?? 1,
      kycStatus: user?.kycStatus ?? "none",
      limitKes: resolveMonthlyLimit(user?.kycTier ?? 1),
    });
  } catch (error) {
    console.error("getKycJob error:", error);
    return res.status(500).json({ success: false, error: "Failed to load job" });
  }
}
