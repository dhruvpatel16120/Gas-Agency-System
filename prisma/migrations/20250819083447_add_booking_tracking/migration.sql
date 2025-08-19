-- AlterEnum
ALTER TYPE "public"."BookingStatus" ADD VALUE 'OUT_FOR_DELIVERY';

-- CreateTable
CREATE TABLE "public"."booking_events" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "public"."BookingStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_events_bookingId_idx" ON "public"."booking_events"("bookingId");

-- AddForeignKey
ALTER TABLE "public"."booking_events" ADD CONSTRAINT "booking_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
