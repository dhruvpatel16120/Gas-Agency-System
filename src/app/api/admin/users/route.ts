import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { adminCreateUserSchema, paginationSchema } from "@/lib/validation";
import { ConflictError } from "@/lib/error-handler";
import { sanitizeInput } from "@/lib/security";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { sendAdminInvitationEmail } from "@/lib/email";
import { hashPassword } from "@/lib/utils";

const listQuerySchema = {
  parse: (query: Record<string, string>) => {
    const { page, limit } = paginationSchema.parse({
      page: query.page,
      limit: query.limit,
    });
    const role =
      query.role && ["USER", "ADMIN"].includes(query.role)
        ? (query.role as "USER" | "ADMIN")
        : undefined;
    const search = query.search?.trim();
    type SortBy = "createdAt" | "name" | "email" | "remainingQuota";
    const sortBy =
      ((query.sortBy as SortBy) || "createdAt") as SortBy;
    const sortOrder = (query.sortOrder === "asc" ? "asc" : "desc") as
      | "asc"
      | "desc";
    const pageSize = query.limit
      ? Math.max(1, Math.min(100, parseInt(query.limit, 10)))
      : limit;
    return { page, limit: pageSize, role, search, sortBy, sortOrder } as {
      page: number;
      limit: number;
      role?: "USER" | "ADMIN";
      search?: string;
      sortBy: "createdAt" | "name" | "email" | "remainingQuota";
      sortOrder: "asc" | "desc";
    };
  },
};

async function listUsersHandler(request: NextRequest) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit, role, search, sortBy, sortOrder } =
    listQuerySchema.parse(params);

  const whereClause: Prisma.UserWhereInput = {};
  if (role) whereClause.role = role;
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { userId: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = await prisma.user.count({ where: whereClause });
  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { [sortBy]: sortOrder } as Prisma.UserOrderByWithRelationInput,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      userId: true,
      phone: true,
      address: true,
      role: true,
      remainingQuota: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  return successResponse(
    {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
    "Users retrieved successfully",
  );
}

function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+";
  
  const getChar = (str: string) => str[Math.floor(Math.random() * str.length)];
  
  const chars = [
    getChar(uppercase),
    getChar(lowercase),
    getChar(numbers),
    getChar(symbols),
    getChar(uppercase),
    getChar(lowercase),
    getChar(numbers),
    getChar(symbols),
    getChar(lowercase),
    getChar(numbers),
  ];
  
  return chars.sort(() => Math.random() - 0.5).join("");
}

async function createUserHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const body = await parseRequestBody<Record<string, unknown>>(request);

  if (body.phone !== undefined) {
    const rawPhone = String(body.phone).trim();
    if (rawPhone.length < 10 || rawPhone.length > 13) {
      throw new ConflictError("Phone number length must be between 10 and 13 characters.");
    }
  }

  if (body.address !== undefined) {
    const rawAddress = String(body.address).trim();
    if (rawAddress.length <= 10) {
      throw new ConflictError("Address length must be greater than 10 characters.");
    }
  }

  const { name, userId, email, phone, address, role } =
    adminCreateUserSchema.parse(body);

  // Check uniqueness
  const [existingEmail, existingUserId] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({
      where: { userId: userId.toLowerCase() },
      select: { id: true },
    }),
  ]);

  if (existingEmail) {
    throw new ConflictError("An account with this email already exists", {
      field: "email",
      code: "EMAIL_EXISTS",
    });
  }
  if (existingUserId) {
    throw new ConflictError("This User ID is already taken", {
      field: "userId",
      code: "USER_ID_EXISTS",
    });
  }

  // Generate verification and reset tokens
  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  // Generate system password and hash it
  const generatedPassword = generateSecurePassword();
  const hashedPassword = await hashPassword(generatedPassword);

  // Create user with the hashed password
  const user = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      return tx.user.create({
        data: {
          name: sanitizeInput(name),
          userId: userId.toLowerCase(),
          email,
          phone, // already normalized by validation
          address: sanitizeInput(address),
          role,
          password: hashedPassword,
          remainingQuota: 12,
          emailVerificationToken,
          emailVerificationExpiry,
          resetToken,
          resetTokenExpiry,
        },
        select: {
          id: true,
          name: true,
          userId: true,
          email: true,
          phone: true,
          address: true,
          role: true,
          remainingQuota: true,
          createdAt: true,
        },
      });
    },
  );

  // Get inviter details from session
  const session = context?.session as { user?: { name?: string | null; email?: string | null } } | undefined;
  const adminName = session?.user?.name || "Admin";
  const adminEmail = session?.user?.email || "";

  // Send onboarding email (fire-and-forget)
  Promise.allSettled([
    sendAdminInvitationEmail({
      toEmail: email,
      userName: name,
      generatedPassword,
      role,
      adminName,
      adminEmail,
      emailVerificationToken,
    }),
  ]).catch((e) => console.error("Failed to send onboarding email", e));

  return successResponse(
    user,
    "User created and invitation email with system-generated password sent successfully.",
    201,
  );
}

export const GET = withMiddleware(listUsersHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
export const POST = withMiddleware(createUserHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
