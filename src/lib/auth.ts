import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import { verifyPassword } from './utils';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        admin: { label: 'Admin Login', type: 'text', placeholder: 'false' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          return null;
        }

        const isValidPassword = await verifyPassword(
          credentials.password,
          user.password || ''
        );

        if (!isValidPassword) {
          return null;
        }

        const isAdminAttempt = String(credentials.admin || '').toLowerCase() === 'true';

        // If this is an admin login attempt, enforce admin role
        if (isAdminAttempt && user.role !== 'ADMIN') {
          throw new Error('Admin account required');
        }

        // If this is a user login attempt, block admin accounts from using it
        if (!isAdminAttempt && user.role === 'ADMIN') {
          throw new Error('Please use the admin login portal');
        }

        // Bypass email verification only when explicitly allowed
        const bypassEmailVerification = process.env.BYPASS_EMAIL_VERIFICATION === 'true';

        // For non-admin logins, enforce email verification unless bypassed
        if (!isAdminAttempt && user.role !== 'ADMIN' && !user.emailVerified && !bypassEmailVerification) {
          throw new Error('Please verify your email address before logging in');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image || undefined,
          emailVerified: !!user.emailVerified,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        (token as unknown as { emailVerified?: boolean }).emailVerified = (user as unknown as { emailVerified?: boolean }).emailVerified === true;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        (session.user as unknown as { emailVerified?: boolean }).emailVerified = (token as unknown as { emailVerified?: boolean }).emailVerified === true;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
