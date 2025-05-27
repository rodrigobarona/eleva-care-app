'use client';

import { Button } from '@/components/atoms/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Availability', href: '/booking/schedule' },
  { name: 'Limits', href: '/booking/schedule/limits' },
];

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-eleva-primary">
          Schedule Configuration
        </h1>
        <p className="mt-2 text-eleva-neutral-900/60">
          Manage your availability schedule and booking preferences for client appointments.
        </p>
      </div>

      <div className="space-y-6">
        <nav className="border-b border-eleva-neutral-200">
          <div className="-mb-px flex space-x-8" aria-label="Tabs">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant="link"
                asChild
                className="relative px-1 py-4 text-sm font-medium text-eleva-neutral-900/60 transition-colors hover:text-eleva-neutral-900 data-[current=true]:text-eleva-neutral-900 data-[current=true]:after:absolute data-[current=true]:after:bottom-0 data-[current=true]:after:left-0 data-[current=true]:after:h-0.5 data-[current=true]:after:w-full data-[current=true]:after:bg-eleva-primary"
                data-current={item.href === pathname}
              >
                <Link href={item.href}>{item.name}</Link>
              </Button>
            ))}
          </div>
        </nav>

        <div>{children}</div>
      </div>
    </div>
  );
}
