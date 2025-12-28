/*
  Warnings:

  - You are about to drop the `MpesaTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MpesaTransaction" DROP CONSTRAINT "MpesaTransaction_userId_fkey";

-- DropTable
DROP TABLE "MpesaTransaction";

-- CreateTable
CREATE TABLE "PretiumTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transactionCode" TEXT NOT NULL,
    "isOnramp" BOOLEAN NOT NULL,
    "pretiumType" TEXT,
    "shortcode" TEXT,
    "account_number" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'payment',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receiptNumber" TEXT,
    "transactionDate" TEXT,
    "isRealesed" BOOLEAN NOT NULL,
    "message" TEXT,
    "chamaId" INTEGER,
    "cusdAmount" DECIMAL(18,6),
    "exchangeRate" DECIMAL(10,2),
    "walletAddress" TEXT,
    "blockchainTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PretiumTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PretiumTransaction_transactionCode_key" ON "PretiumTransaction"("transactionCode");

-- CreateIndex
CREATE INDEX "PretiumTransaction_userId_idx" ON "PretiumTransaction"("userId");

-- CreateIndex
CREATE INDEX "PretiumTransaction_transactionCode_idx" ON "PretiumTransaction"("transactionCode");

-- CreateIndex
CREATE INDEX "PretiumTransaction_status_idx" ON "PretiumTransaction"("status");

-- CreateIndex
CREATE INDEX "PretiumTransaction_type_idx" ON "PretiumTransaction"("type");

-- CreateIndex
CREATE INDEX "PretiumTransaction_createdAt_idx" ON "PretiumTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "PretiumTransaction" ADD CONSTRAINT "PretiumTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
