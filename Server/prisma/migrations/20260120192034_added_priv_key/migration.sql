/*
  Warnings:

  - Added the required column `hashedPassphrase` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hashedPrivkey` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hashedPassphrase" TEXT NOT NULL,
ADD COLUMN     "hashedPrivkey" TEXT NOT NULL;

-- Set temporary default values for existing rows
UPDATE "User" SET "hashedPassphrase" = '' WHERE "hashedPassphrase" IS NULL;
UPDATE "User" SET "hashedPrivkey" = '' WHERE "hashedPrivkey" IS NULL;

-- Now make the columns required
ALTER TABLE "User" ALTER COLUMN "hashedPassphrase" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "hashedPrivkey" SET NOT NULL;
