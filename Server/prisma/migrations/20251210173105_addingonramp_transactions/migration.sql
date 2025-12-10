-- AlterTable
ALTER TABLE "MpesaTransaction" ADD COLUMN     "blockchainTxHash" TEXT,
ADD COLUMN     "cusdAmount" DECIMAL(18,6),
ADD COLUMN     "exchangeRate" DECIMAL(10,2),
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'payment',
ADD COLUMN     "walletAddress" TEXT;

-- CreateIndex
CREATE INDEX "MpesaTransaction_type_idx" ON "MpesaTransaction"("type");
