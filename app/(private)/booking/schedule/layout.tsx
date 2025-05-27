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
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Schedule Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your availability schedule and booking preferences for client appointments.
        </p>
      </div>

      <div className="space-y-6">
        <nav className="border-b">
          <div className="-mb-px flex space-x-8" aria-label="Tabs">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant="link"
                asChild
                className="relative px-1 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[current=true]:text-foreground data-[current=true]:after:absolute data-[current=true]:after:bottom-0 data-[current=true]:after:left-0 data-[current=true]:after:h-0.5 data-[current=true]:after:w-full data-[current=true]:after:bg-eleva-primary"
                data-current={item.href === pathname}
              >
                <Link href={item.href}>{item.name}</Link>
              </Button>
            ))}
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
}
