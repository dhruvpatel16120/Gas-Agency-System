import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendDeliveryStatusEmail, sendInvoiceEmail } from "@/lib/email";
import puppeteer from "puppeteer";
import { DeliveryAssignmentStatus } from "@prisma/client";

// POST - Assign a delivery partner to a booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { bookingId, partnerId } = body;

    if (!bookingId || !partnerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID and partner ID are required",
        },
        { status: 400 },
      );
    }

    // Check if booking exists and is approved
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { assignment: true },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 },
      );
    }

    if (booking.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Can only assign delivery to approved bookings",
        },
        { status: 400 },
      );
    }

    if (booking.assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery already assigned to this booking",
        },
        { status: 400 },
      );
    }

    // Check if delivery partner exists and is active
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery partner not found",
        },
        { status: 404 },
      );
    }

    if (!partner.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery partner is not active",
        },
        { status: 400 },
      );
    }

    // Create delivery assignment
    const deliveryAssignment = await prisma.deliveryAssignment.create({
      data: {
        bookingId,
        partnerId,
        status: "ASSIGNED",
        assignedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Keep booking status as APPROVED - don't change to OUT_FOR_DELIVERY automatically
    // Admin will manually change status when delivery partner confirms pickup
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        // status: 'OUT_FOR_DELIVERY', // REMOVED - keep as APPROVED
        updatedAt: new Date(),
      },
    });

    // Create booking event for delivery assignment (not status change)
    await prisma.bookingEvent.create({
      data: {
        bookingId,
        status: "APPROVED", // Keep as APPROVED
        title: "Delivery Assigned",
        description: `Delivery assigned to ${partner.name}. Status remains APPROVED until pickup confirmed.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Delivery partner assigned successfully",
      data: {
        id: deliveryAssignment.id,
        partnerId: deliveryAssignment.partnerId,
        status: deliveryAssignment.status,
        assignedAt: deliveryAssignment.assignedAt,
      },
    });
  } catch (error) {
    console.error("Failed to assign delivery partner:", error);
    return NextResponse.json(
      { success: false, message: "Failed to assign delivery partner" },
      { status: 500 },
    );
  }
}

// PUT - Update delivery assignment status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { bookingId, status, notes, testEmail } = body as {
      bookingId: string;
      status: string;
      notes?: string;
      testEmail?: string;
    };

    if (!bookingId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID and status are required",
        },
        { status: 400 },
      );
    }

    // Check if delivery assignment exists
    const deliveryAssignment = await prisma.deliveryAssignment.findUnique({
      where: { bookingId },
      include: { booking: true },
    });

    if (!deliveryAssignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery assignment not found",
        },
        { status: 404 },
      );
    }

    // Update delivery assignment status
    await prisma.deliveryAssignment.update({
      where: { bookingId },
      data: {
        status: status as DeliveryAssignmentStatus,
        notes: notes || deliveryAssignment.notes,
        updatedAt: new Date(),
      },
    });

    // Update booking status based on delivery status
    let newBookingStatus = deliveryAssignment.booking.status;

    if (status === "PICKED_UP") {
      // When picked up, keep booking as APPROVED
      newBookingStatus = "APPROVED";
    } else if (status === "OUT_FOR_DELIVERY") {
      // When out for delivery, change booking status to OUT_FOR_DELIVERY
      newBookingStatus = "OUT_FOR_DELIVERY";
    } else if (status === "DELIVERED") {
      // When delivered, change booking status to DELIVERED
      newBookingStatus = "DELIVERED";
    } else if (status === "FAILED") {
      // When failed, change booking status to CANCELLED
      newBookingStatus = "CANCELLED";
    }

    // Only update booking status if it's different
    if (newBookingStatus !== deliveryAssignment.booking.status) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newBookingStatus,
          updatedAt: new Date(),
        },
      });

      // Create booking event for status change
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: newBookingStatus,
          title: `Delivery ${status.toLowerCase().replace("_", " ")}`,
          description:
            notes ||
            `Delivery status updated to ${status}. Booking status changed to ${newBookingStatus}.`,
        },
      });
    } else {
      // Create booking event for delivery status update (no booking status change)
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: deliveryAssignment.booking.status,
          title: `Delivery ${status.toLowerCase().replace("_", " ")}`,
          description: notes || `Delivery status updated to ${status}.`,
        },
      });
    }

    // Send email notification to customer about delivery status update
    try {
      const recipientEmail =
        (typeof testEmail === "string" && testEmail.trim()) ||
        deliveryAssignment.booking.userEmail ||
        "";
      if (recipientEmail) {
        await sendDeliveryStatusEmail(
          recipientEmail,
          deliveryAssignment.booking.userName,
          bookingId,
          status,
          notes ||
            `Your delivery status has been updated to ${status.toLowerCase().replace("_", " ")}.`,
        );
      }

      // If delivered, also generate and send the invoice PDF
      if (status === "DELIVERED") {
        try {
          // Fetch full booking data for invoice (including user and assignment info)
          const bookingForInvoice = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
              user: {
                select: { name: true, email: true, phone: true, address: true },
              },
              payments: { orderBy: { createdAt: "desc" }, take: 1 },
              assignment: { include: { partner: true } },
            },
          });

          if (
            bookingForInvoice &&
            (recipientEmail ||
              bookingForInvoice.user?.email ||
              bookingForInvoice.userEmail)
          ) {
            const pdfBuffer = await generateInvoicePDF(bookingForInvoice);
            await sendInvoiceEmail(
              (typeof testEmail === "string" && testEmail.trim()) ||
                bookingForInvoice.user?.email ||
                bookingForInvoice.userEmail ||
                "",
              bookingForInvoice.user?.name || bookingForInvoice.userName || "",
              bookingId,
              pdfBuffer instanceof Buffer ? pdfBuffer : Buffer.from(pdfBuffer),
            );
            console.log(
              "Invoice PDF sent successfully to",
              (typeof testEmail === "string" && testEmail.trim()) ||
                bookingForInvoice.user?.email ||
                bookingForInvoice.userEmail,
            );
          }
        } catch (invoiceError) {
          console.error(
            "Failed to generate or send invoice PDF from assignments PUT:",
            invoiceError,
          );
        }
      }
    } catch (emailError) {
      console.error("Failed to send delivery status email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Delivery status updated successfully",
      data: {
        id: deliveryAssignment.id,
        status,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to update delivery status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update delivery status" },
      { status: 500 },
    );
  }
}

// Helper function to generate invoice PDF (duplicated here for isolation)
type InvoiceBooking = {
  id: string;
  quantity: number;
  requestedAt: Date;
  user?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null } | null;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  userAddress?: string | null;
  paymentMethod?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
};

async function generateInvoicePDF(booking: InvoiceBooking): Promise<Uint8Array> {
  const pricePerCylinder = 1100;
  const subtotal = pricePerCylinder * booking.quantity;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const invoiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice - ${booking.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', 'Arial', sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; background: #ffffff; padding: 40px; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
        .header .subtitle { font-size: 18px; font-weight: 300; opacity: 0.9; }
        .content { padding: 40px; }
        .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 30px; }
        .meta-section h3 { color: #374151; font-size: 16px; font-weight: 600; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .meta-section p { margin-bottom: 6px; color: #6b7280; }
        .meta-section strong { color: #1f2937; font-weight: 500; }
        .company-info { background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea; }
        .company-info h3 { color: #667eea; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
        .company-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .company-detail { display: flex; align-items: center; gap: 8px; }
        .company-detail .icon { width: 16px; height: 16px; background: #667eea; border-radius: 50%; display: inline-block; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background-color: #d1fae5; color: #065f46; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .items-table th { background: #f8fafc; color: #374151; font-weight: 600; padding: 20px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-table td { padding: 20px; border-bottom: 1px solid #f3f4f6; color: #6b7280; }
        .items-table tr:last-child td { border-bottom: none; }
        .item-description { font-weight: 500; color: #1f2937; }
        .totals { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 30px; }
        .totals-table { width: 100%; max-width: 400px; margin-left: auto; }
        .totals-table tr { border-bottom: 1px solid #e5e7eb; }
        .totals-table tr:last-child { border-bottom: 3px solid #667eea; border-top: 2px solid #e5e7eb; }
        .totals-table td { padding: 12px 20px; font-size: 16px; }
        .total-row { font-weight: 700; font-size: 18px; color: #1f2937; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #6b7280; border-top: 1px solid #e5e7eb; margin-top: 40px; }
        .footer h4 { color: #374151; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
        .footer p { margin-bottom: 8px; }
        .payment-info { background: #fef7ff; border: 1px solid #e879f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .payment-info h4 { color: #a21caf; font-size: 16px; font-weight: 600; margin-bottom: 10px; }
        @media print { body { padding: 0; } .invoice-container { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>Gas Agency System</h1>
          <div class="subtitle">Professional Gas Cylinder Service</div>
        </div>
        <div class="content">
          <div class="company-info">
            <h3>Company Information</h3>
            <div class="company-details">
              <div class="company-detail"><span class="icon"></span><strong>Gas Agency System Pvt. Ltd.</strong></div>
              <div class="company-detail"><span class="icon"></span>123 Main Street, Business District, City 12345</div>
              <div class="company-detail"><span class="icon"></span>Phone: +91-1234567890</div>
              <div class="company-detail"><span class="icon"></span>Email: billing@gasagency.com</div>
              <div class="company-detail"><span class="icon"></span>GST: 27ABCDE1234F1Z5</div>
              <div class="company-detail"><span class="icon"></span>License: GA-2024-001234</div>
            </div>
          </div>
          <div class="invoice-meta">
            <div class="meta-section">
              <h3>Invoice Details</h3>
              <p><strong>Invoice Number:</strong> INV-${booking.id.slice(-8).toUpperCase()}</p>
              <p><strong>Issue Date:</strong> ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
              <p><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <div class="meta-section">
              <h3>Booking Information</h3>
              <p><strong>Booking ID:</strong> ${booking.id.slice(-8).toUpperCase()}</p>
              <p><strong>Status:</strong> <span class="status-badge">DELIVERED</span></p>
              <p><strong>Requested:</strong> ${new Date(booking.requestedAt).toLocaleDateString("en-IN")}</p>
              <p><strong>Delivered:</strong> ${new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          <div class="meta-section">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.user?.name || booking.userName || "N/A"}</p>
            <p><strong>Email:</strong> ${booking.user?.email || booking.userEmail || "N/A"}</p>
            <p><strong>Phone:</strong> ${booking.user?.phone || booking.userPhone || "N/A"}</p>
            <p><strong>Delivery Address:</strong> ${booking.user?.address || booking.userAddress || "N/A"}</p>
            ${
              booking.receiverName &&
              booking.receiverName !== (booking.user?.name || booking.userName)
                ? `<p><strong>Receiver:</strong> ${booking.receiverName} (${booking.receiverPhone || "N/A"})</p>`
                : ""
            }
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%">Description</th>
                <th style="width: 15%; text-align: center;">Quantity</th>
                <th style="width: 20%; text-align: right;">Unit Price</th>
                <th style="width: 15%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="item-description">Premium Gas Cylinder (14.2 kg)<br><small style="color: #9ca3af;">High-quality LPG cylinder with safety valve</small></td>
                <td style="text-align: center; font-weight: 500;">${booking.quantity}</td>
                <td style="text-align: right; font-weight: 500;">₹${pricePerCylinder.toLocaleString("en-IN")}</td>
                <td style="text-align: right; font-weight: 600; color: #1f2937;">₹${subtotal.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
          ${
            booking.paymentMethod
              ? `
          <div class="payment-info">
            <h4>Payment Information</h4>
            <p><strong>Payment Method:</strong> ${booking.paymentMethod === "UPI" ? "UPI/Online Payment" : "Cash on Delivery"}</p>
            <p><strong>Payment Status:</strong> SUCCESS</p>
          </div>
          `
              : ""
          }
          <div class="totals">
            <table class="totals-table">
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td style="text-align: right;"><strong>₹${subtotal.toLocaleString("en-IN")}</strong></td>
              </tr>
              <tr>
                <td><strong>GST (18%):</strong></td>
                <td style="text-align: right;"><strong>₹${gst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr class="total-row">
                <td><strong>Total Amount:</strong></td>
                <td style="text-align: right;"><strong>₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
            </table>
          </div>
        </div>
        <div class="footer">
          <h4>Thank You for Your Business!</h4>
          <p>For any queries regarding this invoice, please contact us at billing@gasagency.com</p>
          <p>or call our customer service at +91-1234567890</p>
          <br>
          <p><small>This is a computer-generated invoice and does not require a physical signature.</small></p>
          <p><small>Generated on ${new Date().toLocaleString("en-IN")} • Invoice ID: INV-${booking.id.slice(-8).toUpperCase()}</small></p>
        </div>
      </div>
    </body>
    </html>
  `;

  let browser;
  let page;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setContent(invoiceHtml, { waitUntil: ["domcontentloaded"] });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
          <span>Invoice INV-${booking.id?.slice(-8).toUpperCase() || "INVOICE"} • Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      preferCSSPageSize: true,
    });
    return pdfBuffer;
  } catch (error) {
    console.error("PDF generation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to generate PDF: ${errorMessage}`);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error("Error closing page:", e);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error("Error closing browser:", e);
      }
    }
  }
}
