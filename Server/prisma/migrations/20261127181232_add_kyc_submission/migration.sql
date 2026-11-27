-- CreateTable
CREATE TABLE "KycSubmission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "docNumberEnc" TEXT NOT NULL,
    "docNumberHash" TEXT NOT NULL,
    "frontKey" TEXT,
    "backKey" TEXT,
    "selfieKey" TEXT,
    "livenessPrompt" TEXT NOT NULL,
    "flags" JSONB,
    "reviewedBy" INTEGER,
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "imagesPurgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycSubmission_jobId_key" ON "KycSubmission"("jobId");

-- CreateIndex
CREATE INDEX "KycSubmission_docNumberHash_idx" ON "KycSubmission"("docNumberHash");

-- CreateIndex
CREATE INDEX "KycSubmission_userId_createdAt_idx" ON "KycSubmission"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "KycSubmission_reviewedAt_idx" ON "KycSubmission"("reviewedAt");

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KycJob"("jobId") ON DELETE RESTRICT ON UPDATE CASCADE;
