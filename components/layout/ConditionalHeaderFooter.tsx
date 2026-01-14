'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/ui/Header';
import Footer from '@/components/layout/Footer';

export default function ConditionalHeaderFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  return (
    <>
      {!isDashboardRoute && <Header />}
      {children}
      {!isDashboardRoute && <Footer />}
    </>
  );
}
