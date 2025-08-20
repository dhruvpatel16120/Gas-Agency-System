import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                      req.nextUrl.pathname.startsWith('/admin/login') ||
                      req.nextUrl.pathname.startsWith('/register') ||
                      req.nextUrl.pathname.startsWith('/forgot-password') ||
                      req.nextUrl.pathname.startsWith('/reset-password') ||
                      req.nextUrl.pathname.startsWith('/verify-email');
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin');
    const isUserPage = req.nextUrl.pathname.startsWith('/user');

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      // Redirect to appropriate dashboard based on role
      if (token?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else {
        return NextResponse.redirect(new URL('/user', req.url));
      }
    }

    // Protect admin routes (except admin login page)
    if (isAdminPage && !req.nextUrl.pathname.startsWith('/admin/login')) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
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
      // Prevent admins from accessing user routes
      if (token?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      // Optionally enforce verified email at edge (defense-in-depth)
      const emailVerified = (token as unknown as { emailVerified?: boolean })?.emailVerified;
      if (emailVerified === false) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return null;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow auth pages without authentication
        if (
          req.nextUrl.pathname.startsWith('/login') ||
          req.nextUrl.pathname.startsWith('/admin/login') ||
          req.nextUrl.pathname.startsWith('/register') ||
          req.nextUrl.pathname.startsWith('/forgot-password') ||
          req.nextUrl.pathname.startsWith('/reset-password') ||
          req.nextUrl.pathname.startsWith('/verify-email')
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin/login',
    '/user/:path*',
    '/login',
    '/register',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
