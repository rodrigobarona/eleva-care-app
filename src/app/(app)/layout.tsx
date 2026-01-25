import { IntlProvider } from '@/app/providers';
import { AppBreadcrumb } from '@/components/layout/sidebar/AppBreadcrumb';
import { AppSidebar } from '@/components/layout/sidebar/AppSidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/layout/sidebar/sidebar';
import { Separator } from '@/components/ui/separator';
import { defaultLocale } from '@/lib/i18n/routing';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

interface PrivateLayoutProps {
  children: ReactNode;
}

/**
 * Private Layout - AuthKit Protected with i18n Support
 *
 * All routes in (app) require authentication.
 * Auth is verified via withAuth() which auto-redirects to WorkOS sign-in if not authenticated.
 * Internationalization is provided via IntlProvider for translations.
 */
export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  // Require authentication - auto-redirects if not logged in
  await withAuth({ ensureSignedIn: true });

  // Get locale from cookie or use default
  const cookieStore = await cookies();
  const locale = cookieStore.get('ELEVA_LOCALE')?.value || defaultLocale;

  // Load messages for the detected locale
  const messages = await getMessages({ locale });

  return (
    <IntlProvider locale={locale} messages={messages}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 rounded-t-xl bg-white">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <AppBreadcrumb />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-b-xl bg-white p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </IntlProvider>
  );
}
