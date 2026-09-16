-- Save for Goal: additive tables only (no drops). Safe for existing data.

-- AlterTable PretiumTransaction
ALTER TABLE "PretiumTransaction" ADD COLUMN IF NOT EXISTS "goalId" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Goal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "goalType" TEXT NOT NULL,
    "targetAmount" TEXT NOT NULL DEFAULT '0',
    "endDate" TIMESTAMP(3),
    "yieldEnabled" BOOLEAN NOT NULL DEFAULT false,
    "blockchainId" TEXT NOT NULL,
    "createTxHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notifyPhone" TEXT,
    "coverImageUrl" TEXT,
    "creatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoalMember" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txHash" TEXT,

    CONSTRAINT "GoalMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoalContribution" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,
    "contributorAddress" TEXT NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "contributorUserId" INTEGER,
    "payerUserId" INTEGER,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestDisplayName" TEXT,
    "txHash" TEXT NOT NULL,
    "pretiumTxCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoalWithdrawal" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Goal_slug_key" ON "Goal"("slug");
CREATE INDEX IF NOT EXISTS "Goal_creatorId_createdAt_idx" ON "Goal"("creatorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Goal_status_idx" ON "Goal"("status");
CREATE INDEX IF NOT EXISTS "Goal_goalType_idx" ON "Goal"("goalType");
CREATE INDEX IF NOT EXISTS "Goal_blockchainId_idx" ON "Goal"("blockchainId");

CREATE UNIQUE INDEX IF NOT EXISTS "GoalMember_goalId_userId_key" ON "GoalMember"("goalId", "userId");
CREATE INDEX IF NOT EXISTS "GoalMember_userId_idx" ON "GoalMember"("userId");

CREATE INDEX IF NOT EXISTS "GoalContribution_goalId_createdAt_idx" ON "GoalContribution"("goalId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "GoalContribution_contributorUserId_idx" ON "GoalContribution"("contributorUserId");
CREATE INDEX IF NOT EXISTS "GoalContribution_txHash_idx" ON "GoalContribution"("txHash");

CREATE INDEX IF NOT EXISTS "GoalWithdrawal_goalId_createdAt_idx" ON "GoalWithdrawal"("goalId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "GoalWithdrawal_creatorId_idx" ON "GoalWithdrawal"("creatorId");

CREATE INDEX IF NOT EXISTS "PretiumTransaction_goalId_idx" ON "PretiumTransaction"("goalId");

-- AddForeignKey (guarded)
DO $$ BEGIN
  ALTER TABLE "Goal" ADD CONSTRAINT "Goal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GoalMember" ADD CONSTRAINT "GoalMember_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GoalMember" ADD CONSTRAINT "GoalMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_contributorUserId_fkey" FOREIGN KEY ("contributorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GoalWithdrawal" ADD CONSTRAINT "GoalWithdrawal_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GoalWithdrawal" ADD CONSTRAINT "GoalWithdrawal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PretiumTransaction" ADD CONSTRAINT "PretiumTransaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
