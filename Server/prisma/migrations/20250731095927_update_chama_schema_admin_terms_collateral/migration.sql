/*
  Warnings:

  - You are about to drop the column `tags` on the `Chama` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chama" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "adminTerms" TEXT,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "payDate" DATETIME NOT NULL,
    "cycleTime" INTEGER NOT NULL,
    "started" BOOLEAN NOT NULL DEFAULT false,
    "amount" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "maxNo" INTEGER NOT NULL DEFAULT 15,
    "blockchainId" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "canJoin" BOOLEAN NOT NULL DEFAULT true,
    "payOutOrder" TEXT,
    "collateralRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promoCode" TEXT,
    CONSTRAINT "Chama_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Chama" ("adminId", "amount", "blockchainId", "canJoin", "createdAt", "cycle", "cycleTime", "description", "id", "maxNo", "name", "payDate", "payOutOrder", "promoCode", "round", "slug", "startDate", "started", "type") SELECT "adminId", "amount", "blockchainId", "canJoin", "createdAt", "cycle", "cycleTime", "description", "id", "maxNo", "name", "payDate", "payOutOrder", "promoCode", "round", "slug", "startDate", "started", "type" FROM "Chama";
DROP TABLE "Chama";
ALTER TABLE "new_Chama" RENAME TO "Chama";
CREATE UNIQUE INDEX "Chama_slug_key" ON "Chama"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
