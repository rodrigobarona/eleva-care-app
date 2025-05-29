import Footer from '@/components/organisms/Footer';
import Header from '@/components/organisms/Header';
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
