import { NextRequest } from "next/server";
import {
  withMiddleware,
  successResponse,
  parseRequestBody,
  errorResponse,
} from "@/lib/api-middleware";
import {
  sendContactAcknowledgementEmail,
  sendContactFormToAdmin,
} from "@/lib/email";
import { prisma } from "@/lib/db";

const handler = async (
  request: NextRequest,
  context?: Record<string, unknown>,
) => {
  const session = (context as { session?: { user?: { id: string } } })?.session as
    | { user?: { id: string } }
    | undefined;
  if (!session?.user?.id) {
    return errorResponse("AUTH_REQUIRED", "Authentication required", 401);
  }

  const body = await parseRequestBody(request);
  const {
    subject,
    message,
    category,
    priority,
    relatedBookingId,
    preferredContact,
    phone,
  } = (body || {}) as Record<string, string | undefined>;

  if (!subject || !message) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Subject and message are required",
      400,
    );
  }

  // Load user profile for email/name
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  if (!user) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  // Persist contact message
  const saved = await prisma.contactMessage.create({
    data: {
      userId: session.user.id,
      subject,
      message,
      category: category || null,
      priority: priority || null,
      relatedBookingId: relatedBookingId || null,
      preferredContact: preferredContact || null,
      phone: phone || null,
      status: "NEW",
    },
  });

  // Send emails (fire-and-forget)
  void sendContactFormToAdmin({
    fromName: user.name,
    fromEmail: user.email,
    subject,
    category,
    priority,
    relatedBookingId,
    preferredContact,
    phone,
    message,
  });
  void sendContactAcknowledgementEmail(user.email, user.name, subject);

  return successResponse(
    { submitted: true, id: saved.id },
    "Your message has been sent",
  );
};

export const POST = withMiddleware(handler, {
  requireAuth: true,
  validateContentType: true,
  rateLimit: { type: "email" },
});
