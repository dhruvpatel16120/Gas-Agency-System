-- AlterTable
ALTER TABLE "public"."bookings" ADD COLUMN     "expectedDate" TIMESTAMP(3),
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "receiverName" TEXT,
ADD COLUMN     "receiverPhone" TEXT,
ADD COLUMN     "userAddress" TEXT,
ADD COLUMN     "userEmail" TEXT,
ADD COLUMN     "userPhone" TEXT;
