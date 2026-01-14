'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/supabaseClient';
import Button from './Button';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login', { scroll: false });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-gray-900">Logo</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            Home
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            Pricing
          </Link>
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
              >
                Dashboard
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </>
          ) : !loading ? (
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          ) : null}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-gray-700 hover:text-gray-900"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <Link
              href="/"
              className="block text-sm font-medium text-gray-700 hover:text-gray-900"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/pricing"
              className="block text-sm font-medium text-gray-700 hover:text-gray-900"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            {!loading && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-sm font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
                    Sign Out
                  </Button>
                </div>
              </>
            ) : !loading ? (
              <div className="pt-4 border-t space-y-2">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
