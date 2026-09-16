-- Baseline for objects already present in production (applied via db push earlier).
-- Idempotent: safe if tables/columns already exist. Does not drop or modify data.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneE164" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycTier" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneE164_key" ON "User"("phoneE164");

CREATE TABLE IF NOT EXISTS "KycJob" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'didit',
    "jobId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawResultRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KycJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KycJob_jobId_key" ON "KycJob"("jobId");
CREATE INDEX IF NOT EXISTS "KycJob_userId_createdAt_idx" ON "KycJob"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "KycJob_status_idx" ON "KycJob"("status");

DO $$ BEGIN
  ALTER TABLE "KycJob" ADD CONSTRAINT "KycJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MoonwellYield" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "earned" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoonwellYield_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MoonwellYield_userId_createdAt_idx" ON "MoonwellYield"("userId", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "MoonwellYield" ADD CONSTRAINT "MoonwellYield_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
