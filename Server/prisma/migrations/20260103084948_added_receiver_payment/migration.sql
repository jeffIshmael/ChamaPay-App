-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_chamaId_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiver" TEXT,
ALTER COLUMN "chamaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_chamaId_fkey" FOREIGN KEY ("chamaId") REFERENCES "Chama"("id") ON DELETE SET NULL ON UPDATE CASCADE;
