import { isAdmin } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { BanknoteIcon, Tag, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  // Check if user is admin using the centralized isAdmin function
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect(`/${process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 border-r pr-4 pt-4 md:sticky md:block">
          <nav className="relative space-y-2 py-2">
            <h2 className="mb-4 px-2 text-xl font-semibold tracking-tight">Admin Dashboard</h2>
            <div className="space-y-1">
              <Link
                href="/admin/users"
                className="group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:bg-muted hover:text-foreground"
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Users</span>
              </Link>
              <Link
                href="/admin/categories"
                className="group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:bg-muted hover:text-foreground"
              >
                <Tag className="mr-2 h-4 w-4" />
                <span>Categories</span>
              </Link>
              <Link
                href="/admin/payment-transfers"
                className="group flex w-full items-center rounded-md border border-transparent px-2 py-1 hover:bg-muted hover:text-foreground"
              >
                <BanknoteIcon className="mr-2 h-4 w-4" />
                <span>Payment Transfers</span>
              </Link>
            </div>
          </nav>
        </aside>
        <main className="flex w-full flex-col overflow-hidden pt-4">{children}</main>
      </div>
    </div>
  );
}
