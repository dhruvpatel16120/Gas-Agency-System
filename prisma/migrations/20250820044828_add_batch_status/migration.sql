/*
  Warnings:

  - Added the required column `updatedAt` to the `cylinder_batches` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'EXPIRED');

-- AlterTable
ALTER TABLE "public"."cylinder_batches" ADD COLUMN     "status" "public"."BatchStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
