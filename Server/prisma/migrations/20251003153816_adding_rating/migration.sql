/*
  Warnings:

  - You are about to drop the `EmailVerification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PendingUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `collateralRequired` on the `Chama` table. All the data in the column will be lost.
  - You are about to drop the column `promoCode` on the `Chama` table. All the data in the column will be lost.
  - You are about to drop the column `incognito` on the `ChamaMember` table. All the data in the column will be lost.
  - You are about to drop the column `mnemonics` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `privKey` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profile` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `smartAddress` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EmailVerification_pendingUserId_key";

-- DropIndex
DROP INDEX "PendingUser_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmailVerification";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PendingUser";
PRAGMA foreign_keys=on;

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
    "blockchainId" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "canJoin" BOOLEAN NOT NULL DEFAULT true,
    "payOutOrder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chama_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Chama" ("adminId", "adminTerms", "amount", "blockchainId", "canJoin", "createdAt", "cycle", "cycleTime", "description", "id", "maxNo", "name", "payDate", "payOutOrder", "round", "slug", "startDate", "started", "type") SELECT "adminId", "adminTerms", "amount", "blockchainId", "canJoin", "createdAt", "cycle", "cycleTime", "description", "id", "maxNo", "name", "payDate", "payOutOrder", "round", "slug", "startDate", "started", "type" FROM "Chama";
DROP TABLE "Chama";
ALTER TABLE "new_Chama" RENAME TO "Chama";
CREATE UNIQUE INDEX "Chama_slug_key" ON "Chama"("slug");
CREATE TABLE "new_ChamaMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "chamaId" INTEGER NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "payDate" DATETIME NOT NULL,
    CONSTRAINT "ChamaMember_chamaId_fkey" FOREIGN KEY ("chamaId") REFERENCES "Chama" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChamaMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChamaMember" ("chamaId", "id", "isPaid", "payDate", "userId") SELECT "chamaId", "id", "isPaid", "payDate", "userId" FROM "ChamaMember";
DROP TABLE "ChamaMember";
ALTER TABLE "new_ChamaMember" RENAME TO "ChamaMember";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "phoneNo" INTEGER,
    "address" TEXT,
    "smartAddress" TEXT NOT NULL,
    "profileImageUrl" TEXT
);
INSERT INTO "new_User" ("address", "email", "id", "phoneNo", "profileImageUrl") SELECT "address", "email", "id", "phoneNo", "profileImageUrl" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_userName_key" ON "User"("userName");
CREATE UNIQUE INDEX "User_smartAddress_key" ON "User"("smartAddress");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
