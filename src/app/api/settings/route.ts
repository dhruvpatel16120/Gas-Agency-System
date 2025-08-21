import { NextRequest, NextResponse } from "next/server";

// GET: Fetch public system settings
export async function GET(_request: NextRequest) {
  try {
    void _request;
    // Get UPI ID from environment variables
    const upiRegex = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{2,64}$/;
    const rawEnvUpi = (
      process.env.ADMIN_UPI_ID ||
      process.env.UPI_ID ||
      ""
    ).trim();
    const adminUpiId = rawEnvUpi && upiRegex.test(rawEnvUpi) ? rawEnvUpi : null;

    // Fixed pricing
    const pricePerCylinder = 1100;

    return NextResponse.json({
      success: true,
      data: {
        adminUpiId,
        pricePerCylinder,
      },
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load settings" },
      { status: 500 },
    );
  }
}
