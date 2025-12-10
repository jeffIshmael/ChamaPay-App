-- CreateTable
CREATE TABLE "MpesaTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "merchantRequestID" TEXT NOT NULL,
    "checkoutRequestID" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mpesaReceiptNumber" TEXT,
    "transactionDate" TEXT,
    "resultCode" INTEGER,
    "resultDesc" TEXT,
    "accountReference" TEXT,
    "transactionDesc" TEXT,
    "chamaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_merchantRequestID_key" ON "MpesaTransaction"("merchantRequestID");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_checkoutRequestID_key" ON "MpesaTransaction"("checkoutRequestID");

-- CreateIndex
CREATE INDEX "MpesaTransaction_userId_idx" ON "MpesaTransaction"("userId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_checkoutRequestID_idx" ON "MpesaTransaction"("checkoutRequestID");

-- CreateIndex
CREATE INDEX "MpesaTransaction_status_idx" ON "MpesaTransaction"("status");

-- CreateIndex
CREATE INDEX "MpesaTransaction_createdAt_idx" ON "MpesaTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
