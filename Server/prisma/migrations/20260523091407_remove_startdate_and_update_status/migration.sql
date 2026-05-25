/*
  Warnings:

  - You are about to drop the column `startDate` on the `Chama` table. All the data in the column will be lost.
  - You are about to drop the column `started` on the `Chama` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chama" DROP COLUMN "startDate",
DROP COLUMN "started",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
