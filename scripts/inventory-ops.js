const { PrismaClient } = require("@prisma/client");
const {
  colorize,
  askOptions,
  askQuestion,
  askYesNo,
  closeRL,
} = require("./utils");

let prisma;

function initPrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

// 1. View Current Cylinder Stock
async function viewStock() {
  console.log(colorize("\n📊 Current Cylinder Stock", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  const client = initPrisma();
  const stock = await client.cylinderStock.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", totalAvailable: 0 },
  });

  console.log(`Available Cylinders: ${colorize(stock.totalAvailable, "green")}`);
}

// 2. Manual Stock Adjustment
async function adjustStock() {
  console.log(colorize("\n⚙️  Manual Stock Adjustment", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  const client = initPrisma();
  const stock = await client.cylinderStock.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", totalAvailable: 0 },
  });

  console.log(`Current Available Stock: ${colorize(stock.totalAvailable, "yellow")} cylinders`);

  const deltaStr = await askQuestion(colorize("Adjustment Delta (e.g. +10, -5)", "blue"));
  const delta = parseInt(deltaStr, 10);

  if (isNaN(delta) || delta === 0) {
    console.log(colorize("❌ Invalid adjustment value. Value cannot be 0.", "red"));
    return;
  }

  if (stock.totalAvailable + delta < 0) {
    console.log(
      colorize(
        `❌ Insufficient stock: Current available stock is ${stock.totalAvailable}, cannot decrease by ${Math.abs(
          delta
        )}.`,
        "red"
      )
    );
    return;
  }

  const reason = await askQuestion(colorize("Reason for adjustment", "blue"), "Manual adjustment via CLI");
  const notes = await askQuestion(colorize("Notes (optional)", "blue"), "");

  const typeOptions = [
    { label: "Correction (CORRECTION)", value: "CORRECTION" },
    { label: "Receive (RECEIVE)", value: "RECEIVE" },
    { label: "Issue (ISSUE)", value: "ISSUE" },
  ];
  const type = await askOptions("Select Adjustment Type:", typeOptions);

  await client.$transaction(async (tx) => {
    // Record adjustment log
    await tx.stockAdjustment.create({
      data: {
        stockId: "default",
        delta,
        type,
        reason,
        notes: notes || undefined,
      },
    });

    // Update stock capacity
    await tx.cylinderStock.update({
      where: { id: "default" },
      data: {
        totalAvailable: {
          increment: delta,
        },
      },
    });
  });

  console.log(colorize(`\n✅ Stock adjusted successfully by ${delta}.`, "green"));
}

// 3. List Cylinder Batches
async function listBatches() {
  console.log(colorize("\n📦 Cylinder Batches", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━", "cyan"));

  const client = initPrisma();
  const batches = await client.cylinderBatch.findMany({
    orderBy: { receivedAt: "desc" },
  });

  if (batches.length === 0) {
    console.log(colorize("No batches found.", "yellow"));
    return;
  }

  const formatted = batches.map((b) => ({
    ID: b.id.substring(0, 8) + "...",
    Supplier: b.supplier,
    Invoice: b.invoiceNo || "-",
    Quantity: b.quantity,
    Received: new Date(b.receivedAt).toLocaleDateString(),
    Status: b.status,
  }));
  console.table(formatted);
}

// 4. Create New Cylinder Batch
async function createBatch() {
  console.log(colorize("\n➕ Create New Batch", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━", "cyan"));

  const supplier = await askQuestion(colorize("Supplier Name", "blue"));
  if (!supplier || supplier.trim().length < 2) {
    console.log(colorize("❌ Supplier name is required.", "red"));
    return;
  }

  const invoiceNo = await askQuestion(colorize("Invoice Number (optional)", "blue"), "");
  const qtyStr = await askQuestion(colorize("Quantity received", "blue"));
  const quantity = parseInt(qtyStr, 10);

  if (isNaN(quantity) || quantity <= 0) {
    console.log(colorize("❌ Quantity must be greater than 0.", "red"));
    return;
  }

  const notes = await askQuestion(colorize("Notes (optional)", "blue"), "");
  const receivedAtStr = await askQuestion(
    colorize("Received Date (YYYY-MM-DD)", "blue"),
    new Date().toISOString().split("T")[0]
  );

  const client = initPrisma();
  await client.$transaction(async (tx) => {
    const batch = await tx.cylinderBatch.create({
      data: {
        supplier,
        invoiceNo: invoiceNo || undefined,
        quantity,
        notes: notes || undefined,
        receivedAt: new Date(receivedAtStr),
        status: "ACTIVE",
      },
    });

    // Update stock levels
    await tx.cylinderStock.update({
      where: { id: "default" },
      data: {
        totalAvailable: {
          increment: quantity,
        },
      },
    });

    // Log adjustment
    await tx.stockAdjustment.create({
      data: {
        stockId: "default",
        delta: quantity,
        type: "RECEIVE",
        reason: `Cylinder batch received from ${supplier}`,
        batchId: batch.id,
      },
    });
  });

  console.log(colorize("\n✅ Cylinder batch created successfully.", "green"));
}

// 5. Update Batch Quantity
async function updateBatch() {
  console.log(colorize("\n✏️  Update Batch Quantity/Status", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  const client = initPrisma();
  const batches = await client.cylinderBatch.findMany({
    where: { status: "ACTIVE" },
  });

  if (batches.length === 0) {
    console.log(colorize("No active batches available to modify.", "yellow"));
    return;
  }

  const options = batches.map((b) => ({
    label: `${b.supplier} - Qty: ${b.quantity} (Recv: ${new Date(b.receivedAt).toLocaleDateString()})`,
    value: b.id,
  }));
  options.push({ label: "Go Back", value: "back" });

  const batchId = await askOptions("Select batch to update:", options);
  if (batchId === "back") return;

  const oldBatch = batches.find((b) => b.id === batchId);

  const qtyStr = await askQuestion(
    colorize(`New Quantity (current: ${oldBatch.quantity})`, "blue"),
    oldBatch.quantity.toString()
  );
  const newQty = parseInt(qtyStr, 10);

  if (isNaN(newQty) || newQty <= 0) {
    console.log(colorize("❌ Quantity must be greater than 0.", "red"));
    return;
  }

  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Depleted", value: "DEPLETED" },
    { label: "Expired", value: "EXPIRED" },
  ];
  const newStatus = await askOptions(colorize(`New Status (current: ${oldBatch.status})`, "blue"), statusOptions);

  const diff = newQty - oldBatch.quantity;

  if (diff !== 0) {
    const stock = await client.cylinderStock.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", totalAvailable: 0 },
    });

    if (stock.totalAvailable + diff < 0) {
      console.log(
        colorize(
          `❌ Insufficient stock: Updating batch would decrease available stock below 0. Current available stock: ${stock.totalAvailable}, cannot decrease by ${Math.abs(
            diff
          )}.`,
          "red"
        )
      );
      return;
    }
  }

  await client.$transaction(async (tx) => {
    await tx.cylinderBatch.update({
      where: { id: batchId },
      data: {
        quantity: newQty,
        status: newStatus,
      },
    });

    if (diff !== 0) {
      // Update stock levels
      await tx.cylinderStock.update({
        where: { id: "default" },
        data: {
          totalAvailable: {
            increment: diff,
          },
        },
      });

      // Log adjustment
      await tx.stockAdjustment.create({
        data: {
          stockId: "default",
          delta: diff,
          type: diff > 0 ? "RECEIVE" : "ISSUE",
          reason: `Batch quantity updated for supplier ${oldBatch.supplier}`,
          batchId,
        },
      });
    }
  });

  console.log(colorize("\n✅ Batch updated successfully.", "green"));
}

// 6. Delete Cylinder Batch
async function deleteBatch() {
  console.log(colorize("\n🗑️  Delete Cylinder Batch", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  const client = initPrisma();
  const batches = await client.cylinderBatch.findMany();

  if (batches.length === 0) {
    console.log(colorize("No batches found.", "yellow"));
    return;
  }

  const options = batches.map((b) => ({
    label: `${b.supplier} - Qty: ${b.quantity} (ID: ${b.id.substring(0, 8)}...)`,
    value: b.id,
  }));
  options.push({ label: "Go Back", value: "back" });

  const batchId = await askOptions("Select batch to delete:", options);
  if (batchId === "back") return;

  const oldBatch = batches.find((b) => b.id === batchId);

  const stock = await client.cylinderStock.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", totalAvailable: 0 },
  });

  if (stock.totalAvailable - oldBatch.quantity < 0) {
    console.log(
      colorize(
        `❌ Insufficient stock: Deleting batch would decrease available stock below 0. Current available stock: ${stock.totalAvailable}, batch quantity is ${oldBatch.quantity}.`,
        "red"
      )
    );
    return;
  }

  const confirm = await askYesNo(
    colorize(
      `⚠️  Are you sure you want to delete the batch from ${oldBatch.supplier}? This will reduce stock by ${oldBatch.quantity}.`,
      "yellow"
    ),
    "n"
  );

  if (!confirm) {
    console.log(colorize("\nDeletion cancelled.", "yellow"));
    return;
  }

  await client.$transaction(async (tx) => {
    // Delete batch
    await tx.cylinderBatch.delete({
      where: { id: batchId },
    });

    // Update stock levels
    await tx.cylinderStock.update({
      where: { id: "default" },
      data: {
        totalAvailable: {
          decrement: oldBatch.quantity,
        },
      },
    });

    // Log adjustment
    await tx.stockAdjustment.create({
      data: {
        stockId: "default",
        delta: -oldBatch.quantity,
        type: "ISSUE",
        reason: `Deleted cylinder batch from supplier ${oldBatch.supplier}`,
      },
    });
  });

  console.log(colorize("\n✅ Cylinder batch deleted successfully.", "green"));
}

// 7. View Stock Adjustment History
async function viewHistory() {
  console.log(colorize("\n📜 Stock Adjustment History", "cyan"));
  console.log(colorize("━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan"));

  const client = initPrisma();
  const logs = await client.stockAdjustment.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  if (logs.length === 0) {
    console.log(colorize("No adjustments found.", "yellow"));
    return;
  }

  const formatted = logs.map((l) => ({
    Type: l.type,
    Delta: l.delta > 0 ? `+${l.delta}` : `${l.delta}`,
    Reason: l.reason || "-",
    Date: new Date(l.createdAt).toLocaleString(),
  }));
  console.table(formatted);
}

// Main CLI Loop
async function main() {
  console.log(colorize("\n📦 Gas Agency Inventory Management CLI", "cyan"));
  console.log(colorize("=====================================", "cyan"));

  const options = [
    { label: "View Current Cylinder Stock", value: "view" },
    { label: "Manual Stock Adjustment", value: "adjust" },
    { label: "List Cylinder Batches", value: "list-batches" },
    { label: "Create New Cylinder Batch", value: "create-batch" },
    { label: "Update Batch Quantity/Status", value: "update-batch" },
    { label: "Delete Cylinder Batch", value: "delete-batch" },
    { label: "View Stock Adjustment History", value: "history" },
    { label: "Exit", value: "exit" },
  ];

  try {
    while (true) {
      const choice = await askOptions("Select an operation:", options);

      if (choice === "exit") break;
      if (choice === "view") await viewStock();
      if (choice === "adjust") await adjustStock();
      if (choice === "list-batches") await listBatches();
      if (choice === "create-batch") await createBatch();
      if (choice === "update-batch") await updateBatch();
      if (choice === "delete-batch") await deleteBatch();
      if (choice === "history") await viewHistory();
    }
  } catch (error) {
    console.error(colorize(`\n❌ Error: ${error.message}`, "red"));
  } finally {
    if (prisma) await prisma.$disconnect();
    closeRL();
  }
}

if (require.main === module) {
  main();
}
