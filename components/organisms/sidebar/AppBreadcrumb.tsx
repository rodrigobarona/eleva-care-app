import { Breadcrumb, BreadcrumbList } from '@/components/molecules/breadcrumb';
import { Suspense } from 'react';

import { AppBreadcrumbContent } from './AppBreadcrumbContent';

function AppBreadcrumbSkeleton() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <div className="bg-muted h-6 w-24 animate-pulse rounded" />
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppBreadcrumb() {
  return (
    <Suspense fallback={<AppBreadcrumbSkeleton />}>
      <AppBreadcrumbContent />
    </Suspense>
  );
}
