import Footer from '@/components/layout/footer/Footer';
import Header from '@/components/layout/header/Header';
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
