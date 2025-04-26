'use client';

import { defaultLocale } from '@/locales';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PublicIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${defaultLocale}`);
  }, [router]);

  return null;
}
