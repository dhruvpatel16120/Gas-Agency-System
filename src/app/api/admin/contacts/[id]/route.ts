import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { NotFoundError } from "@/lib/error-handler";

async function getContactHandler(
  _request: NextRequest,
  context?: { params?: { id?: string } | Promise<{ id?: string }> },
) {
  const raw = context?.params;
  const awaited = raw && typeof (raw as Promise<{ id?: string }> ).then === "function" ? await (raw as Promise<{ id?: string }>) : (raw as { id?: string } | undefined);
  const id = (awaited?.id as string) || undefined;
  if (!id) throw new NotFoundError("Contact ID is required");

  const item = await prisma.contactMessage.findUnique({
    where: { id },
    include: { replies: { include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } }, user: true }
  });

  if (!item) throw new NotFoundError("Contact not found");

  return successResponse(item, "Contact retrieved");
}

async function updateContactHandler(
  request: NextRequest,
  context?: { params?: { id?: string } | Promise<{ id?: string }> },
) {
  const raw = context?.params;
  const awaited = raw && typeof (raw as Promise<{ id?: string }> ).then === "function" ? await (raw as Promise<{ id?: string }>) : (raw as { id?: string } | undefined);
  const id = (awaited?.id as string) || undefined;
  if (!id) throw new NotFoundError("Contact ID is required");

  const body = await parseRequestBody<Record<string, unknown>>(request);
  const updates: Record<string, unknown> = {};
  const allowed = ["status", "category", "priority"] as const;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      updates[k] = (body as Record<string, unknown>)[k];
    }
  }
  const updated = await prisma.contactMessage.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      status: true,
      category: true,
      priority: true,
      updatedAt: true,
    },
  });
  return successResponse(updated, "Updated");
}

export const GET = withMiddleware(getContactHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
export const PUT = withMiddleware(updateContactHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
