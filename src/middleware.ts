import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                      req.nextUrl.pathname.startsWith('/register');
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin');
    const isUserPage = req.nextUrl.pathname.startsWith('/user');

    // Redirect authenticated users away from auth pages
    if (isAuthPage) {
      if (isAuth) {
        // Redirect to appropriate dashboard based on role
        if (token?.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin', req.url));
        } else {
          return NextResponse.redirect(new URL('/user', req.url));
        }
      }
      return null;
    }

    // Protect admin routes
    if (isAdminPage) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/user', req.url));
      }
    }

    // Protect user routes
    if (isUserPage) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return null;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/user/:path*',
    '/login',
    '/register',
  ],
};
