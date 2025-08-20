/*
  Warnings:

  - You are about to drop the column `upiQrImageUrl` on the `system_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."system_settings" DROP COLUMN "upiQrImageUrl",
ADD COLUMN     "transctionId" TEXT;
