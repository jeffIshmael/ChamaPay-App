-- CreateIndex
CREATE INDEX "Chama_payDate_idx" ON "Chama"("payDate");

-- CreateIndex
CREATE INDEX "Chama_status_payDate_idx" ON "Chama"("status", "payDate");

-- CreateIndex
CREATE INDEX "ChamaMember_chamaId_userId_idx" ON "ChamaMember"("chamaId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_chamaId_type_idx" ON "Notification"("chamaId", "type");

-- CreateIndex
CREATE INDEX "PayOut_userId_doneAt_idx" ON "PayOut"("userId", "doneAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_userId_doneAt_idx" ON "Payment"("userId", "doneAt" DESC);

-- CreateIndex
CREATE INDEX "PretiumTransaction_userId_createdAt_idx" ON "PretiumTransaction"("userId", "createdAt" DESC);
