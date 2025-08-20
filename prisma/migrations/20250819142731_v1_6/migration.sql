-- CreateEnum
CREATE TYPE "public"."StockAdjustmentType" AS ENUM ('RECEIVE', 'ISSUE', 'DAMAGE', 'AUDIT', 'CORRECTION');

-- AlterTable
ALTER TABLE "public"."stock_adjustments" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "type" "public"."StockAdjustmentType" NOT NULL DEFAULT 'CORRECTION';

-- CreateTable
CREATE TABLE "public"."cylinder_batches" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "invoiceNo" TEXT,
    "quantity" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cylinder_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_adjustments_bookingId_idx" ON "public"."stock_adjustments"("bookingId");

-- CreateIndex
CREATE INDEX "stock_adjustments_batchId_idx" ON "public"."stock_adjustments"("batchId");

-- AddForeignKey
ALTER TABLE "public"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."cylinder_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
