/*
  Warnings:

  - You are about to drop the column `isPaid` on the `ChamaMember` table. All the data in the column will be lost.

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
    "rating" INTEGER NOT NULL DEFAULT 0,
    "raterCount" INTEGER NOT NULL DEFAULT 0,
    "blockchainId" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "canJoin" BOOLEAN NOT NULL DEFAULT true,
    "payOutOrder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chama_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Chama" ("adminId", "adminTerms", "amount", "blockchainId", "canJoin", "createdAt", "cycle", "cycleTime", "description", "id", "maxNo", "name", "payDate", "payOutOrder", "rating", "round", "slug", "startDate", "started", "type") SELECT "adminId", "adminTerms", "amount", "blockchainId", "canJoin", "createdAt", "cycle", "cycleTime", "description", "id", "maxNo", "name", "payDate", "payOutOrder", "rating", "round", "slug", "startDate", "started", "type" FROM "Chama";
DROP TABLE "Chama";
ALTER TABLE "new_Chama" RENAME TO "Chama";
CREATE UNIQUE INDEX "Chama_slug_key" ON "Chama"("slug");
CREATE TABLE "new_ChamaMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "chamaId" INTEGER NOT NULL,
    "payDate" DATETIME NOT NULL,
    CONSTRAINT "ChamaMember_chamaId_fkey" FOREIGN KEY ("chamaId") REFERENCES "Chama" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChamaMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChamaMember" ("chamaId", "id", "payDate", "userId") SELECT "chamaId", "id", "payDate", "userId" FROM "ChamaMember";
DROP TABLE "ChamaMember";
ALTER TABLE "new_ChamaMember" RENAME TO "ChamaMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
