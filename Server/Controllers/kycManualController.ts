import crypto from "crypto";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  applyJobDecision, // must be exported from ./kycController (see notes)
  type KycIdentityDetails,
} from "./kycController";
import {
  decryptKycDocumentNumber,
  encryptKycDocumentNumber,
} from "../Lib/kycPii";
import {
  deleteObject,
  getSignedReadUrl,
  putPrivateObject,
} from "../Lib/r2Storage";

const prisma = new PrismaClient();

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_SUBMISSIONS_PER_DAY = 5;
const CHALLENGE_TTL_MS = 15 * 60 * 1000;

const DOC_LABELS: Record<string, string> = {
  id_card: "Identity Card",
  passport: "Passport",
};

const LIVENESS_PROMPTS = [
  "Turn your head slowly to the left",
  "Turn your head slowly to the right",
  "Hold up three fingers next to your face",
  "Look up and smile",
  "Close your left eye",
];

function secret(): string {
  const s = process.env.KYC_HASH_SECRET || "";
  if (s.length < 16) {
    throw new Error("KYC_HASH_SECRET must be set (use at least 32 random hex chars)");
  }
  return s;
}

/* -------------------------------------------------------------------------- */
/* Upload middleware (memory storage, then streamed to R2)                    */
/* -------------------------------------------------------------------------- */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 3 },
}).fields([
  { name: "front", maxCount: 1 },
  { name: "back", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

/** Wraps multer so upload errors come back as clean JSON. */
export function kycUpload(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error: "Each image must be under 5 MB. Please retake or compress it.",
      });
    }
    return res.status(400).json({ success: false, error: "Invalid upload" });
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Detect real image type from magic bytes (never trust client mimetype). */
function detectImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function cleanName(value: unknown): string | null {
  const s = String(value ?? "").trim().replace(/\s+/g, " ");
  return /^[\p{L}][\p{L}'’\- ]{0,59}$/u.test(s) ? s : null;
}

function parseDob(value: unknown): { iso: string; age: number } | null {
  const s = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return { iso: s, age };
}

function normalizeDocNumber(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function hashDocNumber(country: string, normalized: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`doc:${country}:${normalized}`)
    .digest("hex");
}

function signChallenge(userId: number, idx: number, exp: number): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`challenge:${userId}:${idx}:${exp}`)
    .digest("hex");
}

/** Returns the prompt text if the token is valid for this user, else null. */
function verifyChallenge(userId: number, token: unknown): string | null {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;
  const idx = Number(parts[0]);
  const exp = Number(parts[1]);
  const sig = parts[2];
  if (!Number.isInteger(idx) || idx < 0 || idx >= LIVENESS_PROMPTS.length) return null;
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  const expected = signChallenge(userId, idx, exp);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return LIVENESS_PROMPTS[idx];
}

/** Normalizes a typed phone number to +<digits>. Returns null if it can't be valid. */
function toE164(phone: unknown, dialCode: unknown): string | null {
  const raw = String(phone ?? "").trim();
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  const dial = String(dialCode ?? "").replace(/\D/g, "");
  if (raw.startsWith("+")) {
    // already international
  } else if (raw.startsWith("00")) {
    d = d.slice(2);
  } else {
    d = d.replace(/^0+/, "");
    if (dial && !d.startsWith(dial)) d = dial + d;
  }
  return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
}

function fail(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error });
}

/* -------------------------------------------------------------------------- */
/* User endpoints                                                             */
/* -------------------------------------------------------------------------- */

/**
 * GET /kyc/manual/challenge
 * Issues a stateless, signed liveness prompt the reviewer will check in the selfie.
 */
export async function getManualChallenge(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return fail(res, 401, "Authentication required");

    const idx = crypto.randomInt(0, LIVENESS_PROMPTS.length);
    const exp = Date.now() + CHALLENGE_TTL_MS;
    const challenge = `${idx}.${exp}.${signChallenge(userId, idx, exp)}`;

    return res.status(200).json({
      success: true,
      prompt: LIVENESS_PROMPTS[idx],
      challenge,
      expiresAt: exp,
    });
  } catch (error) {
    console.error("getManualChallenge error:", error);
    return fail(res, 500, "Could not create challenge");
  }
}

/**
 * GET /kyc/manual/status — latest submission state (reference, review status, reason).
 */
export async function getManualStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return fail(res, 401, "Authentication required");

    const sub = await prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { job: { select: { status: true } } },
    });

    if (!sub) return res.status(200).json({ success: true, submission: null });

    return res.status(200).json({
      success: true,
      submission: {
        reference: sub.jobId,
        status: sub.job.status, // processing | approved | rejected
        docType: sub.docType,
        submittedAt: sub.createdAt,
        reviewedAt: sub.reviewedAt,
        rejectReason: sub.job.status === "rejected" ? sub.rejectReason : null,
      },
    });
  } catch (error) {
    console.error("getManualStatus error:", error);
    return fail(res, 500, "Failed to load submission");
  }
}

/**
 * POST /kyc/manual/submit  (multipart/form-data)
 * Fields: firstName, lastName, country (ISO3), dateOfBirth (YYYY-MM-DD),
 *         docType (id_card | passport), documentNumber, challenge
 * Files:  front, back (id_card only), selfie
 */
export async function submitManualKyc(req: Request, res: Response) {
  const uploadedKeys: string[] = [];

  try {
    const userId = req.user?.userId;
    if (!userId) return fail(res, 401, "Authentication required");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycTier: true, kycStatus: true, phoneE164: true },
    });
    if (!user) return fail(res, 404, "User not found");

    if (user.kycTier >= 2 && user.kycStatus === "approved") {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: "Identity already verified",
      });
    }

    // One open submission at a time
    const open = await prisma.kycJob.findFirst({
      where: { userId, provider: "manual", status: "processing" },
    });
    if (open) {
      return fail(res, 409, "You already have a submission under review.");
    }

    // Attempt limit
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.kycSubmission.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (recent >= MAX_SUBMISSIONS_PER_DAY) {
      return fail(res, 429, "Too many attempts today. Please try again tomorrow.");
    }

    // ---- Field validation ----
    const body = req.body || {};
    const firstName = cleanName(body.firstName);
    const lastName = cleanName(body.lastName);
    if (!firstName || !lastName) {
      return fail(res, 400, "Enter your first and last name exactly as on your ID.");
    }

    const country = String(body.country || "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(country)) {
      return fail(res, 400, "Select the country that issued your document.");
    }

    const phone = toE164(body.phone || user.phoneE164, body.dialCode);
    if (!phone) return fail(res, 400, "Enter a valid phone number.");

    const dob = parseDob(body.dateOfBirth);
    if (!dob) return fail(res, 400, "Enter a valid date of birth.");
    if (dob.age < 18) return fail(res, 400, "You must be 18 or older to verify.");
    if (dob.age > 110) return fail(res, 400, "Enter a valid date of birth.");

    const docType = String(body.docType || "");
    if (!DOC_LABELS[docType]) {
      return fail(res, 400, "Choose ID card / driver's license or passport.");
    }

    const normalizedNumber = normalizeDocNumber(body.documentNumber);
    if (normalizedNumber.length < 5 || normalizedNumber.length > 20) {
      return fail(res, 400, "Enter a valid document number.");
    }
    if (country === "KEN" && docType === "id_card" && !/^\d{7,8}$/.test(normalizedNumber)) {
      return fail(res, 400, "Kenyan ID numbers have 7 or 8 digits.");
    }

    const livenessPrompt = verifyChallenge(userId, body.challenge);
    if (!livenessPrompt) {
      return fail(res, 400, "Your selfie session expired. Please retake the selfie.");
    }

    // ---- Files ----
    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const front = files.front?.[0];
    const back = files.back?.[0];
    const selfie = files.selfie?.[0];

    if (!front || !selfie || (docType === "id_card" && !back)) {
      return fail(res, 400, "Upload every required image before submitting.");
    }

    const images: { field: "front" | "back" | "selfie"; file: Express.Multer.File }[] = [
      { field: "front", file: front },
      { field: "selfie", file: selfie },
    ];
    if (docType === "id_card" && back) images.push({ field: "back", file: back });

    const detected = new Map<string, { mime: string; ext: string }>();
    for (const { field, file } of images) {
      const d = detectImage(file.buffer);
      if (!d) return fail(res, 400, "Images must be JPG, PNG or WebP.");
      detected.set(field, d);
    }

    // ---- Duplicate document across accounts ----
    const docNumberHash = hashDocNumber(country, normalizedNumber);
    const duplicate = await prisma.kycSubmission.findFirst({
      where: {
        docNumberHash,
        userId: { not: userId },
        job: { status: "approved" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return fail(
        res,
        409,
        "This document is already linked to another account. Contact support if you think this is a mistake."
      );
    }

    // ---- Upload to R2 ----
    const jobId = `man_${userId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const keys: Record<string, string> = {};

    for (const { field, file } of images) {
      const d = detected.get(field)!;
      const key = `kyc/${userId}/${jobId}/${field}.${d.ext}`;
      await putPrivateObject(key, file.buffer, d.mime);
      uploadedKeys.push(key);
      keys[field] = key;
    }

    // ---- Persist ----
    const flags: string[] = [];
    // Same user previously rejected with the same number is worth a glance.
    const priorSame = await prisma.kycSubmission.findFirst({
      where: { userId, docNumberHash, job: { status: "rejected" } },
      select: { id: true },
    });
    if (priorSame) flags.push("resubmitted_after_rejection");

    await prisma.$transaction([
      prisma.kycJob.create({
        data: {
          userId,
          provider: "manual",
          jobId,
          documentType: DOC_LABELS[docType],
          status: "processing",
          rawResultRef: "manual_submission",
        },
      }),
      prisma.kycSubmission.create({
        data: {
          userId,
          jobId,
          docType,
          country,
          phoneE164: phone,
          firstName,
          lastName,
          dateOfBirth: dob.iso,
          docNumberEnc: encryptKycDocumentNumber(normalizedNumber) as string,
          docNumberHash,
          frontKey: keys.front,
          backKey: keys.back ?? null,
          selfieKey: keys.selfie,
          livenessPrompt,
          flags: flags.length ? flags : undefined,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { kycStatus: "pending" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      reference: jobId,
      status: "processing",
      message: "Submitted. We review most submissions within 24 hours.",
    });
  } catch (error) {
    console.error("submitManualKyc error:", error);
    // Don't leave orphaned ID images behind if the DB write failed.
    await Promise.allSettled(uploadedKeys.map((k) => deleteObject(k)));
    return fail(res, 500, "Failed to submit verification");
  }
}

/* -------------------------------------------------------------------------- */
/* Admin review                                                               */
/* -------------------------------------------------------------------------- */

/** Reviewers are listed in KYC_ADMIN_USER_IDS (comma-separated user ids). */
export function requireKycAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  const allowed = (process.env.KYC_ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n));
  if (!userId || !allowed.includes(userId)) {
    return fail(res, 403, "Not authorized");
  }
  return next();
}

/** GET /admin/kyc/queue — oldest first. No images here (cheap list). */
export async function adminKycQueue(_req: Request, res: Response) {
  try {
    const rows = await prisma.kycSubmission.findMany({
      where: { job: { status: "processing" } },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        jobId: true,
        docType: true,
        country: true,
        firstName: true,
        lastName: true,
        flags: true,
        createdAt: true,
        user: { select: { id: true, userName: true } },
      },
    });
    return res.status(200).json({ success: true, count: rows.length, items: rows });
  } catch (error) {
    console.error("adminKycQueue error:", error);
    return fail(res, 500, "Failed to load queue");
  }
}

/** GET /admin/kyc/:id — full detail with 5-minute signed image URLs. */
export async function adminKycDetail(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, "Invalid id");

    const sub = await prisma.kycSubmission.findUnique({
      where: { id },
      include: {
        job: { select: { status: true } },
        user: { select: { id: true, userName: true, email: true, phoneE164: true } },
      },
    });
    if (!sub) return fail(res, 404, "Submission not found");

    const [frontUrl, backUrl, selfieUrl] = await Promise.all([
      sub.frontKey ? getSignedReadUrl(sub.frontKey, 300) : null,
      sub.backKey ? getSignedReadUrl(sub.backKey, 300) : null,
      sub.selfieKey ? getSignedReadUrl(sub.selfieKey, 300) : null,
    ]);

    console.log(`[KYC] reviewer ${req.user?.userId} opened submission ${id}`);

    return res.status(200).json({
      success: true,
      submission: {
        id: sub.id,
        reference: sub.jobId,
        status: sub.job.status,
        docType: sub.docType,
        country: sub.country,
        firstName: sub.firstName,
        lastName: sub.lastName,
        dateOfBirth: sub.dateOfBirth,
        documentNumber: decryptKycDocumentNumber(sub.docNumberEnc),
        phone: sub.phoneE164,
        livenessPrompt: sub.livenessPrompt,
        flags: sub.flags,
        submittedAt: sub.createdAt,
        user: sub.user,
        images: { frontUrl, backUrl, selfieUrl },
      },
    });
  } catch (error) {
    console.error("adminKycDetail error:", error);
    return fail(res, 500, "Failed to load submission");
  }
}

/**
 * POST /admin/kyc/:id/decision
 * Body: { decision: "approve" | "reject", reason?: string }
 */
export async function adminKycDecision(req: Request, res: Response) {
  try {
    const reviewerId = req.user?.userId;
    const id = Number(req.params.id);
    const decision = String(req.body?.decision || "");
    const reason = String(req.body?.reason || "").trim().slice(0, 200);

    if (!reviewerId || !Number.isInteger(id)) return fail(res, 400, "Invalid request");
    if (decision !== "approve" && decision !== "reject") {
      return fail(res, 400, "decision must be approve or reject");
    }
    if (decision === "reject" && reason.length < 3) {
      return fail(res, 400, "Give the user a short reason for the rejection.");
    }

    const sub = await prisma.kycSubmission.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!sub) return fail(res, 404, "Submission not found");
    if (sub.job.status !== "processing") {
      return fail(res, 409, "This submission was already reviewed.");
    }
    if (sub.userId === reviewerId) {
      return fail(res, 403, "You cannot review your own submission.");
    }

    if (decision === "approve") {
      const identity: KycIdentityDetails = {
        documentType: DOC_LABELS[sub.docType] ?? sub.docType,
        firstName: sub.firstName,
        lastName: sub.lastName,
        fullName: `${sub.firstName} ${sub.lastName}`.trim(),
        dateOfBirth: sub.dateOfBirth,
        documentNumber: decryptKycDocumentNumber(sub.docNumberEnc),
        nationality: sub.country,
      };
      await applyJobDecision(sub.jobId, "approved", `manual_review:${reviewerId}`, identity);
    } else {
      await applyJobDecision(sub.jobId, "rejected", `manual_review:${reviewerId}`);
    }

    await prisma.kycSubmission.update({
      where: { id },
      data: {
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectReason: decision === "reject" ? reason : null,
      },
    });

    console.log(`[KYC] reviewer ${reviewerId} ${decision}d submission ${id} (user ${sub.userId})`);
    return res.status(200).json({ success: true, status: decision === "approve" ? "approved" : "rejected" });
  } catch (error) {
    console.error("adminKycDecision error:", error);
    return fail(res, 500, "Failed to record decision");
  }
}

/* -------------------------------------------------------------------------- */
/* Retention                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Deletes ID/selfie images from R2 for submissions reviewed more than
 * KYC_IMAGE_RETENTION_DAYS ago (default 30). Typed identity data stays on User.
 * Call once a day (see notes).
 */
export async function purgeExpiredKycImages(): Promise<number> {
  const days = Number(process.env.KYC_IMAGE_RETENTION_DAYS || 30);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.kycSubmission.findMany({
    where: { reviewedAt: { lt: cutoff }, imagesPurgedAt: null },
    take: 100,
  });

  let purged = 0;
  for (const row of rows) {
    const keys = [row.frontKey, row.backKey, row.selfieKey].filter(Boolean) as string[];
    try {
      await Promise.all(keys.map((k) => deleteObject(k)));
      await prisma.kycSubmission.update({
        where: { id: row.id },
        data: { frontKey: null, backKey: null, selfieKey: null, imagesPurgedAt: new Date() },
      });
      purged++;
    } catch (e) {
      console.warn(`[KYC] purge failed for submission ${row.id}:`, e);
    }
  }
  if (purged) console.log(`[KYC] purged images for ${purged} submissions`);
  return purged;
}