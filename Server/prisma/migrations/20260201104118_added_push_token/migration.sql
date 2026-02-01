-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotify" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "pushNotify" BOOLEAN NOT NULL DEFAULT false;
