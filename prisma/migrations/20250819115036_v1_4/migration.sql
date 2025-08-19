/*
  Warnings:

  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropTable
DROP TABLE "public"."notifications";

-- DropEnum
DROP TYPE "public"."NotificationType";
