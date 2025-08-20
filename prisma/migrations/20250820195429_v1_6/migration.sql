-- AlterTable
ALTER TABLE "public"."delivery_assignments" ADD COLUMN     "priority" TEXT DEFAULT 'normal',
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "scheduledTime" TEXT;
