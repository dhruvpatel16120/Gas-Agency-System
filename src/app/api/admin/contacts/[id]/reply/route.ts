import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { NotFoundError } from "@/lib/error-handler";
import { sendContactReplyEmail } from "@/lib/email";

async function postReplyHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const { session } = (context || {}) as {
    session?: { user?: { id: string; email: string } };
  };
  // In Next.js 15+, params is a Promise
  const rawParams = (context as Record<string, unknown>)?.params;
  const awaited =
    rawParams && typeof (rawParams as Promise<{ id?: string }>).then === "function"
      ? await (rawParams as Promise<{ id?: string }>)
      : (rawParams as { id?: string } | undefined);
  const id = awaited?.id;
  if (!id) throw new NotFoundError("Contact ID is required");

  console.log("DEBUG REPLY SESSION:", JSON.stringify(session));



  const body = await parseRequestBody<{ body: string }>(request);
  if (!body?.body || body.body.trim().length === 0) {
    return successResponse({ created: false }, "Reply body required", 400);
  }

  const contact = await prisma.contactMessage.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      subject: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!contact) throw new NotFoundError("Contact not found");

  const authorEmail = session?.user?.email;
  if (!authorEmail) throw new NotFoundError("Author email is required");

  const dbUser = await prisma.user.findUnique({
    where: { email: authorEmail },
    select: { id: true },
  });

  if (!dbUser) {
    throw new NotFoundError("Admin user not found. Please log in again.");
  }

  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.contactReply.create({
      data: {
        messageId: id,
        authorId: dbUser.id,
        body: body.body,
        isAdmin: true,
      },
      select: { id: true, body: true, createdAt: true },
    });
    await tx.contactMessage.update({
      where: { id },
      data: { status: "OPEN", lastRepliedAt: new Date() },
    });
    return created;
  });


  // Email the user (professional HTML template)
  void sendContactReplyEmail({
    toEmail: contact.user.email,
    userName: contact.user.name,
    subject: contact.subject,
    replyBody: body.body,
  });

  return successResponse(reply, "Reply sent");
}

export const POST = withMiddleware(postReplyHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
