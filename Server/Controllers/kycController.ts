import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import {
  getMonthToDateOnrampKes,
  getTier1MonthlyKes,
  getTier2MonthlyKes,
  resolveMonthlyLimit,
} from "../Lib/kycService";
import {
  verifySignatureRaw,
  verifySignatureSimple,
  verifySignatureV2,
} from "../Lib/diditWebhook";

const prisma = new PrismaClient();

const DIDIT_SESSION_URL = "https://verification.didit.me/v3/session/";

/**
 * Didit Console sandbox application (separate from live).
 * Same API host; sandbox keys mock providers and accept `sandbox_scenario`.
 */
const isDiditSandbox = () => process.env.DIDIT_SANDBOX === "true";

/**
 * Skip Didit entirely (no sessionToken). Only for offline UI/tier testing.
 * Prefer real Didit sandbox keys + DIDIT_SANDBOX=true instead.
 */
const isLocalMock = () => process.env.DIDIT_LOCAL_MOCK === "true";

/** Default happy-path scenario for Didit sandbox session create. */
function resolveSandboxScenario(reqBody?: { sandboxScenario?: string }): string | undefined {
  if (!isDiditSandbox()) return undefined;
  const fromBody = String(reqBody?.sandboxScenario || "").trim();
  const fromEnv = String(process.env.DIDIT_SANDBOX_SCENARIO || "").trim();
  return fromBody || fromEnv || "approve";
}

function makeLocalJobId(userId: number): string {
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
      sandbox: isDiditSandbox(),
      localMock: isLocalMock(),
      provider: "didit",
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
 * POST /kyc/session — create a Didit verification session.
 * With DIDIT_SANDBOX=true + sandbox API keys, passes sandbox_scenario (default: approve).
 * Returns sessionToken for the React Native SDK (no browser redirect).
 */
export async function createKycSession(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
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

    const apiKey = process.env.DIDIT_API_KEY || "";
    const workflowId = process.env.DIDIT_WORKFLOW_ID || "";

    // Offline local mock only — not Didit Console sandbox.
    if (isLocalMock() || req.body?.forceLocalSandbox) {
      const jobId = makeLocalJobId(userId);
      await prisma.kycJob.create({
        data: {
          userId,
          provider: "didit",
          jobId,
          documentType: "DIDIT_WORKFLOW",
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
        sessionId: jobId,
        sessionToken: null,
        sandbox: isDiditSandbox(),
        localMock: true,
        provider: "didit",
        message: "Local mock session — use /kyc/sandbox/approve after UI",
      });
    }

    if (!apiKey || !workflowId) {
      return res.status(503).json({
        success: false,
        error:
          "Didit is not configured. Set DIDIT_API_KEY and DIDIT_WORKFLOW_ID from your sandbox (or live) application.",
      });
    }

    const sandboxScenario = resolveSandboxScenario(req.body);
    const sessionBody: Record<string, unknown> = {
      workflow_id: workflowId,
      vendor_data: String(userId),
      metadata: {
        source: "chamapay",
        platform: "mobile",
        environment: isDiditSandbox() ? "sandbox" : "live",
      },
    };
    // Only valid on Didit sandbox applications (400 on live keys).
    if (sandboxScenario) {
      sessionBody.sandbox_scenario = sandboxScenario;
    }

    const diditRes = await fetch(DIDIT_SESSION_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionBody),
    });

    const rawText = await diditRes.text();
    let session: Record<string, unknown> = {};
    try {
      session = rawText ? JSON.parse(rawText) : {};
    } catch {
      session = {};
    }

    if (!diditRes.ok) {
      console.error("[KYC] Didit session create failed:", diditRes.status, rawText.slice(0, 500));
      return res.status(502).json({
        success: false,
        error: "Failed to create Didit verification session",
        details: (session as any)?.detail || (session as any)?.message || undefined,
      });
    }

    const sessionId = String(session.session_id || "");
    const sessionToken = String(session.session_token || "");
    if (!sessionId || !sessionToken) {
      console.error("[KYC] Didit response missing session fields:", rawText.slice(0, 500));
      return res.status(502).json({
        success: false,
        error: "Didit session response incomplete",
      });
    }

    await prisma.kycJob.create({
      data: {
        userId,
        provider: "didit",
        jobId: sessionId,
        documentType: "DIDIT_WORKFLOW",
        status: "pending",
        rawResultRef: JSON.stringify({
          status: session.status,
          workflow_id: session.workflow_id,
          sandbox_scenario: sandboxScenario || null,
          environment: isDiditSandbox() ? "sandbox" : "live",
        }).slice(0, 2000),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: "pending" },
    });

    return res.status(200).json({
      success: true,
      jobId: sessionId,
      sessionId,
      sessionToken,
      sandbox: isDiditSandbox(),
      localMock: false,
      sandboxScenario: sandboxScenario || null,
      provider: "didit",
      status: session.status || "Not Started",
    });
  } catch (error) {
    console.error("createKycSession error:", error);
    return res.status(500).json({ success: false, error: "Failed to create KYC session" });
  }
}

/**
 * POST /kyc/jobs/:jobId/client-result
 * Mobile reports SDK completion; tier upgrade still waits for webhook (or sandbox approve).
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

    const clientStatus = String(req.body?.status || "").trim();
    const resultRef = req.body?.resultRef
      ? String(req.body.resultRef).slice(0, 500)
      : job.rawResultRef;

    await prisma.kycJob.update({
      where: { id: job.id },
      data: {
        status: "processing",
        rawResultRef: resultRef,
      },
    });

    return res.status(200).json({
      success: true,
      status: "processing",
      clientStatus: clientStatus || undefined,
      message: "Awaiting Didit webhook confirmation",
      sandbox: isDiditSandbox(),
      localMock: isLocalMock(),
    });
  } catch (error) {
    console.error("reportClientKycResult error:", error);
    return res.status(500).json({ success: false, error: "Failed to record KYC result" });
  }
}

async function applyJobDecision(
  jobId: string,
  decision: "approved" | "rejected" | "in_review",
  rawResultRef?: string
) {
  const job = await prisma.kycJob.findUnique({ where: { jobId } });
  if (!job) return null;

  if (decision === "approved") {
    await prisma.kycJob.update({
      where: { id: job.id },
      data: {
        status: "approved",
        rawResultRef: rawResultRef ?? job.rawResultRef,
      },
    });
    await prisma.user.update({
      where: { id: job.userId },
      data: {
        kycTier: 2,
        kycStatus: "approved",
        kycVerifiedAt: new Date(),
      },
    });
  } else if (decision === "rejected") {
    await prisma.kycJob.update({
      where: { id: job.id },
      data: {
        status: "rejected",
        rawResultRef: rawResultRef ?? job.rawResultRef,
      },
    });
    await prisma.user.update({
      where: { id: job.userId },
      data: { kycStatus: "rejected" },
    });
  } else {
    await prisma.kycJob.update({
      where: { id: job.id },
      data: {
        status: "processing",
        rawResultRef: rawResultRef ?? job.rawResultRef,
      },
    });
    await prisma.user.update({
      where: { id: job.userId },
      data: { kycStatus: "pending_review" },
    });
  }

  return job;
}

function mapDiditStatus(
  status: string
): "approved" | "rejected" | "in_review" | "pending" {
  switch (status) {
    case "Approved":
      return "approved";
    case "Declined":
      return "rejected";
    case "In Review":
      return "in_review";
    case "In Progress":
    case "Not Started":
    case "Resubmitted":
    case "Abandoned":
    case "Expired":
    case "Kyc Expired":
    case "Awaiting User":
    default:
      return "pending";
  }
}

function verifyDiditWebhook(req: Request): boolean {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) {
    if (!isDiditSandbox()) {
      console.warn(
        "[KYC] DIDIT_WEBHOOK_SECRET unset; accepting webhook without signature check"
      );
    } else {
      console.warn(
        "[KYC] DIDIT_WEBHOOK_SECRET unset in sandbox; accepting webhook without signature check"
      );
    }
    return true;
  }

  const timestamp = String(req.headers["x-timestamp"] || "");
  const signatureV2 = String(req.headers["x-signature-v2"] || "");
  const signatureRaw = String(req.headers["x-signature"] || "");
  const signatureSimple = String(req.headers["x-signature-simple"] || "");
  const body = (req.body || {}) as Record<string, unknown>;
  const rawBody = String((req as any).rawBody || "");

  if (signatureV2 && verifySignatureV2(body, signatureV2, timestamp, secret)) {
    return true;
  }
  if (signatureRaw && rawBody && verifySignatureRaw(rawBody, signatureRaw, timestamp, secret)) {
    return true;
  }
  if (signatureSimple && verifySignatureSimple(body, signatureSimple, timestamp, secret)) {
    return true;
  }

  return false;
}

/**
 * POST /kyc/webhook — Didit callback (no user auth; signature checked).
 */
export async function diditKycWebhook(req: Request, res: Response) {
  try {
    if (!verifyDiditWebhook(req)) {
      return res.status(401).json({ success: false, error: "Invalid webhook signature" });
    }

    const body = req.body || {};
    const webhookType = String(body.webhook_type || "");
    const sessionId = String(body.session_id || "");
    const status = String(body.status || "");
    const eventId = body.event_id ? String(body.event_id) : "";
    const vendorData = body.vendor_data != null ? String(body.vendor_data) : "";
    const environment = body.environment != null ? String(body.environment) : "";
    const sandboxScenario =
      body.sandbox_scenario != null ? String(body.sandbox_scenario) : "";

    // Fast-ack non-session events we don't act on
    if (
      webhookType &&
      webhookType !== "status.updated" &&
      webhookType !== "data.updated"
    ) {
      return res.status(200).json({ success: true, ignored: true, webhookType });
    }

    if (!sessionId) {
      console.warn("[KYC] Didit webhook missing session_id", JSON.stringify(body).slice(0, 400));
      return res.status(400).json({ success: false, error: "Missing session_id" });
    }

    let job = await prisma.kycJob.findUnique({ where: { jobId: sessionId } });

    // Fallback: match by vendor_data (user id) if session row missing
    if (!job && vendorData && /^\d+$/.test(vendorData)) {
      job = await prisma.kycJob.findFirst({
        where: { userId: Number(vendorData), provider: "didit" },
        orderBy: { createdAt: "desc" },
      });
      if (job && job.jobId !== sessionId) {
        // Keep original jobId if already terminal; otherwise align to Didit session id
        if (job.status === "pending" || job.status === "processing") {
          await prisma.kycJob.update({
            where: { id: job.id },
            data: { jobId: sessionId },
          });
          job = { ...job, jobId: sessionId };
        }
      }
    }

    if (!job) {
      console.warn(`[KYC] Unknown Didit session ${sessionId}`);
      // Still 200 so Didit does not retry forever for orphaned test pings
      return res.status(200).json({ success: true, unknownSession: true });
    }

    // Idempotency: skip if we already recorded this event_id
    if (eventId && job.rawResultRef?.includes(eventId)) {
      return res.status(200).json({ success: true, duplicate: true });
    }

    const decision = mapDiditStatus(status);
    const rawSlice = JSON.stringify({
      event_id: eventId || undefined,
      status,
      webhook_type: webhookType,
      environment: environment || undefined,
      sandbox_scenario: sandboxScenario || undefined,
      decision: body.decision,
    }).slice(0, 2000);

    if (decision === "pending") {
      await prisma.kycJob.update({
        where: { id: job.id },
        data: { status: "processing", rawResultRef: rawSlice },
      });
      if (status === "In Progress" || status === "Not Started") {
        await prisma.user.update({
          where: { id: job.userId },
          data: { kycStatus: "pending" },
        });
      }
      return res.status(200).json({ success: true, status: "processing" });
    }

    const updated = await applyJobDecision(job.jobId, decision, rawSlice);
    console.log(
      `[KYC] Didit session ${sessionId} → ${decision} (user ${updated?.userId}, status=${status}, env=${environment || "n/a"}, scenario=${sandboxScenario || "n/a"})`
    );
    return res.status(200).json({ success: true, status: decision });
  } catch (error) {
    console.error("diditKycWebhook error:", error);
    return res.status(500).json({ success: false, error: "Webhook processing failed" });
  }
}

/** @deprecated Alias kept for old imports / route names during migration */
export const smileKycWebhook = diditKycWebhook;

/**
 * POST /kyc/sandbox/approve — only when DIDIT_LOCAL_MOCK=true (offline mock).
 * Not used for Didit Console sandbox — those finish via webhook.
 * Body: { jobId }
 */
export async function sandboxApproveKyc(req: Request, res: Response) {
  try {
    if (!isLocalMock()) {
      return res.status(403).json({
        success: false,
        error:
          "Local mock approvals disabled. With Didit sandbox keys, wait for the Didit webhook (or set DIDIT_LOCAL_MOCK=true).",
      });
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
      provider: job.provider,
      kycTier: user?.kycTier ?? 1,
      kycStatus: user?.kycStatus ?? "none",
      limitKes: resolveMonthlyLimit(user?.kycTier ?? 1),
    });
  } catch (error) {
    console.error("getKycJob error:", error);
    return res.status(500).json({ success: false, error: "Failed to load job" });
  }
}
