import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody, successResponse } from '@/lib/api-middleware';
import { NotFoundError } from '@/lib/error-handler';
import { sendEmail } from '@/lib/email';

async function postReplyHandler(request: NextRequest, context?: Record<string, unknown>) {
  const { params, session } = (context || {}) as { params?: { id?: string }, session?: { user?: { id: string } } };
  const id = params?.id;
  if (!id) throw new NotFoundError('Contact ID is required');

  const body = await parseRequestBody<{ body: string }>(request);
  if (!body?.body || body.body.trim().length === 0) {
    return successResponse({ created: false }, 'Reply body required', 400 as any);
  }

  const contact = await (prisma as any).contactMessage.findUnique({ where: { id }, select: { id: true, userId: true, subject: true, user: { select: { email: true, name: true } } } });
  if (!contact) throw new NotFoundError('Contact not found');

  const reply = await prisma.$transaction(async (tx) => {
    const created = await (tx as any).contactReply.create({
      data: {
        messageId: id,
        authorId: session!.user!.id,
        body: body.body,
        isAdmin: true,
      },
      select: { id: true, body: true, createdAt: true },
    });
    await (tx as any).contactMessage.update({ where: { id }, data: { status: 'OPEN', lastRepliedAt: new Date() } });
    return created;
  });

  // Email the user (simple text email)
  void sendEmail({
    to: contact.user.email,
    subject: `Re: ${contact.subject}`,
    html: `<p>Hello ${contact.user.name},</p><p>${body.body.replace(/\n/g, '<br/>')}</p><p>— Support</p>`,
    text: `Hello ${contact.user.name},\n\n${body.body}\n\n— Support`,
  });

  return successResponse(reply, 'Reply sent');
}

export const POST = withMiddleware(postReplyHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });


