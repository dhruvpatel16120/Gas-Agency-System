'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Flame, Menu, LogOut, User, Calendar, PlusCircle, ChevronDown, Phone } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export default function UserNavbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Centralized routes for menu links
  const PROFILE_ROUTE = '/user/profile';

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);
  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        pathname === href ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  const avatar = (
    <div
      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 text-white font-semibold ring-2 ring-white/30"
      aria-label="User avatar"
      title={session?.user?.name || 'User'}
    >
      {getInitials(session?.user?.name || 'U')}
    </div>
  );

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6" />
            <Link href="/user" className="text-lg font-bold tracking-wide">
              Gas Agency System
            </Link>
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink href="/user" label="Dashboard" />
            <NavLink href="/user/book" label="Booking" />
            <NavLink href="/user/bookings" label="History" />
            <NavLink href="/user/contact" label="Contact" />
          </nav>

          {/* Avatar + menu */}
          {/* Desktop avatar + menu */}
          <div className="relative hidden md:block" ref={menuRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Open user menu"
            >
              {avatar}
              <ChevronDown className="w-4 h-4 text-white/90 group-hover:text-white" />
            </button>

            {open && (
              <div
                className="absolute right-0 mt-3 w-72 origin-top-right transform rounded-2xl bg-white text-gray-900 shadow-2xl ring-1 ring-black/5 transition-all duration-150"
                role="menu"
              >
                {/* caret */}
                <div className="absolute right-6 -top-2 h-4 w-4 rotate-45 bg-white ring-1 ring-black/5"></div>
                {/* header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold ring-4 ring-blue-100">
                      {getInitials(session?.user?.name || 'U')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{session?.user?.email || ''}</p>
                    </div>
                  </div>
                  {session?.user?.role && (
                    <span className="mt-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{String(session.user.role).toLowerCase()}</span>
                  )}
                </div>
                {/* links */}
                <div className="py-2 text-sm">
                  <Link href="/user" className="group flex items-center gap-3 px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600"><Calendar className="w-4 h-4" /></span>
                    <span className="flex-1">Dashboard</span>
                  </Link>
                  <Link href="/user/book" className="group flex items-center gap-3 px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600"><PlusCircle className="w-4 h-4" /></span>
                    <span className="flex-1">New Booking</span>
                  </Link>
                  <Link href="/user/bookings" className="group flex items-center gap-3 px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600"><Calendar className="w-4 h-4" /></span>
                    <span className="flex-1">Booking History</span>
                  </Link>
                  <Link href={PROFILE_ROUTE} className="group flex items-center gap-3 px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600"><User className="w-4 h-4" /></span>
                    <span className="flex-1">Profile</span>
                  </Link>
                  <Link href="/user/contact" className="group flex items-center gap-3 px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600"><Phone className="w-4 h-4" /></span>
                    <span className="flex-1">Contact Us</span>
                  </Link>
                </div>
                {/* footer */}
                <div className="border-t border-gray-100 p-2">
                  <button
                    className="w-full inline-flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={handleSignOut}
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-600"><LogOut className="w-4 h-4" /></span>
                    <span className="flex-1">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile avatar only (no dropdown) */}
          <div className="md:hidden">
            {avatar}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex items-center text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden" id="mobile-nav">
          <div className="fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          <div className="fixed top-16 inset-x-0 z-50 mx-3 rounded-2xl bg-white text-gray-900 shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold ring-4 ring-blue-100">
                  {getInitials(session?.user?.name || 'U')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{session?.user?.email || ''}</p>
                </div>
              </div>
            </div>
            <nav className="p-2 text-sm">
              <Link href="/user" className="block px-4 py-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link href="/user/book" className="block px-4 py-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileOpen(false)}>New Booking</Link>
              <Link href="/user/bookings" className="block px-4 py-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Booking History</Link>
              <Link href={PROFILE_ROUTE} className="block px-4 py-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Profile</Link>
              <Link href="/user/contact" className="block px-4 py-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Contact Us</Link>
            </nav>
            <div className="border-t border-gray-100 p-2">
              <button
                className="w-full rounded-lg px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={async () => { setMobileOpen(false); await signOut({ callbackUrl: '/login' }); }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


