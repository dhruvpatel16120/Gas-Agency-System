-- CreateEnum
CREATE TYPE "public"."StockReservationStatus" AS ENUM ('RESERVED', 'RELEASED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "public"."DeliveryAssignmentStatus" AS ENUM ('ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."cylinder_stock" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "totalAvailable" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cylinder_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_adjustments" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_reservations" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "public"."StockReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."delivery_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "vehicleNumber" TEXT,
    "serviceArea" TEXT,
    "capacityPerDay" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."delivery_assignments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" "public"."DeliveryAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_adjustments_stockId_idx" ON "public"."stock_adjustments"("stockId");

-- CreateIndex
CREATE INDEX "stock_reservations_stockId_idx" ON "public"."stock_reservations"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservations_bookingId_key" ON "public"."stock_reservations"("bookingId");

-- CreateIndex
CREATE INDEX "delivery_assignments_partnerId_idx" ON "public"."delivery_assignments"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_assignments_bookingId_key" ON "public"."delivery_assignments"("bookingId");

-- AddForeignKey
ALTER TABLE "public"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "public"."cylinder_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_reservations" ADD CONSTRAINT "stock_reservations_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "public"."cylinder_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_reservations" ADD CONSTRAINT "stock_reservations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_assignments" ADD CONSTRAINT "delivery_assignments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."delivery_assignments" ADD CONSTRAINT "delivery_assignments_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
