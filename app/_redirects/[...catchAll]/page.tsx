'use client';

import { defaultLocale } from '@/locales';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This component catches all non-localized paths and redirects them to the localized version
export default function CatchAllRedirect({ params }: { params: { catchAll: string[] } }) {
  const router = useRouter();
  const path = `/${params.catchAll.join('/')}`;

  useEffect(() => {
    // Redirect to the localized version of the path
    router.replace(`/${defaultLocale}${path}`);
  }, [path, router]);

  return null;
}
