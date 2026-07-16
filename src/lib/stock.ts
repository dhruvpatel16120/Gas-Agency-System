import { Prisma } from "@prisma/client";
import { ConflictError } from "./error-handler";

/**
 * Checks if stock is available for the given quantity.
 */
export async function checkStockAvailable(
  quantity: number,
  tx: Prisma.TransactionClient
): Promise<boolean> {
  const stock = await tx.cylinderStock.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", totalAvailable: 0 },
  });
  return stock.totalAvailable >= quantity;
}

/**
 * Checks availability and deducts stock for a new booking.
 */
export async function deductStock(
  bookingId: string,
  quantity: number,
  tx: Prisma.TransactionClient
): Promise<void> {
  const stock = await tx.cylinderStock.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", totalAvailable: 0 },
  });

  if (stock.totalAvailable < quantity) {
    throw new ConflictError("Cylinder stock is not available for your request.");
  }

  await tx.cylinderStock.update({
    where: { id: "default" },
    data: { totalAvailable: { decrement: quantity } },
  });

  await tx.stockAdjustment.create({
    data: {
      stockId: "default",
      delta: -quantity,
      type: "ISSUE",
      reason: `Automatic allocation for booking #${bookingId}`,
      bookingId,
    },
  });
}

/**
 * Restores stock for a cancelled booking.
 */
export async function restoreStock(
  bookingId: string,
  quantity: number,
  tx: Prisma.TransactionClient
): Promise<void> {
  // Check if stock has already been restored for this booking
  const existingAdjustment = await tx.stockAdjustment.findFirst({
    where: { bookingId, delta: quantity, type: "RECEIVE" },
  });
  if (existingAdjustment) return; // Prevent double-restore

  await tx.cylinderStock.update({
    where: { id: "default" },
    data: { totalAvailable: { increment: quantity } },
  });

  await tx.stockAdjustment.create({
    data: {
      stockId: "default",
      delta: quantity,
      type: "RECEIVE",
      reason: `Automatic restore for cancelled booking #${bookingId}`,
      bookingId,
    },
  });
}

/**
 * Adjusts stock when a booking's quantity is changed.
 */
export async function adjustStockForBookingQuantityChange(
  bookingId: string,
  oldQuantity: number,
  newQuantity: number,
  tx: Prisma.TransactionClient
): Promise<void> {
  const diff = newQuantity - oldQuantity;
  if (diff === 0) return;

  if (diff > 0) {
    const isAvailable = await checkStockAvailable(diff, tx);
    if (!isAvailable) {
      throw new ConflictError(
        `Cylinder stock is not available for the requested increase of ${diff} cylinder(s).`
      );
    }

    await tx.cylinderStock.update({
      where: { id: "default" },
      data: { totalAvailable: { decrement: diff } },
    });

    await tx.stockAdjustment.create({
      data: {
        stockId: "default",
        delta: -diff,
        type: "ISSUE",
        reason: `Quantity increased for booking #${bookingId}`,
        bookingId,
      },
    });
  } else {
    const absDiff = Math.abs(diff);
    await tx.cylinderStock.update({
      where: { id: "default" },
      data: { totalAvailable: { increment: absDiff } },
    });

    await tx.stockAdjustment.create({
      data: {
        stockId: "default",
        delta: absDiff,
        type: "RECEIVE",
        reason: `Quantity decreased for booking #${bookingId}`,
        bookingId,
      },
    });
  }
}
