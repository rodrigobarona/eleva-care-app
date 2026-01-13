import { SearchDialog } from '@/components/docs/SearchDialog';
import { patientSource } from '@/lib/source';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Root } from 'fumadocs-core/page-tree';
import { getLocale } from 'next-intl/server';

/**
 * Patient Help Center Layout
 *
 * Sidebar layout for patient documentation matching Eleva Care brand styling.
 * Uses Fumadocs Core for navigation tree with custom Eleva-branded styling
 * to align with legal/trust pages visual style.
 * 
 * Note: This layout is outside the [locale] segment, so we get the locale
 * from next-intl's server context instead of URL params.
 */

interface LayoutProps {
  children: ReactNode;
}

export default async function PatientDocsLayout({
  children,
}: LayoutProps) {
  const locale = await getLocale();
  const tree = patientSource.pageTree[locale] ?? patientSource.pageTree.en;

  return (
    <div className="flex min-h-screen bg-eleva-neutral-100/50">
      {/* Sidebar */}
      <aside className="docs-sidebar fixed inset-y-0 left-0 z-30 flex w-72 flex-col overflow-y-auto">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link 
            href="/" 
            className="docs-sidebar-link text-sm font-medium hover:text-eleva-primary"
          >
            ← Back to Eleva Care
          </Link>
        </div>
        <div className="flex-1 p-6">
          <h2 className="docs-sidebar-title mb-4 text-xl">
            Patient Help Center
          </h2>
          {/* Search */}
          <div className="mb-6">
            <SearchDialog />
          </div>
          <nav className="space-y-1">
            <NavigationTree tree={tree} locale={locale} />
          </nav>
        </div>
      </aside>

      {/* Main content area */}
      <div className="ml-72 flex-1">
        <div className="container mx-auto py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// Type for navigation tree items
type TreeNode = Root | Root['children'][number];

/**
 * Recursive navigation tree component
 */
function NavigationTree({
  tree,
  locale,
}: {
  tree: TreeNode;
  locale: string;
}) {
  if (!tree) return null;

  // Handle root node with children
  if ('children' in tree && tree.children && tree.children.length > 0) {
    return (
      <>
        {tree.children.map((child, index) => (
          <NavigationItem key={'url' in child ? child.url : index} item={child} locale={locale} />
        ))}
      </>
    );
  }

  return null;
}

/**
 * Navigation item component for individual tree nodes
 */
function NavigationItem({
  item,
  locale,
}: {
  item: Root['children'][number];
  locale: string;
}) {
  // Handle folder with children
  if (item.type === 'folder') {
    return (
      <div className="mb-4">
        <div className="mb-2 font-serif text-sm font-medium tracking-tight text-eleva-primary/70">
          {item.name}
        </div>
        <div className="ml-2 space-y-1 border-l border-eleva-primary/20 pl-3">
          {item.children?.map((child, index) => (
            <NavigationItem
              key={'url' in child ? child.url : index}
              item={child}
              locale={locale}
            />
          ))}
        </div>
      </div>
    );
  }

  // Handle page
  if (item.type === 'page' && item.url) {
    // Strip locale from URL since we hide it in external URLs
    // e.g., /docs/patient/en/booking -> /docs/patient/booking
    const urlWithoutLocale = item.url.replace(`/docs/patient/${locale}`, '/docs/patient');
    return (
      <Link
        href={urlWithoutLocale}
        className="docs-sidebar-link block rounded-md px-3 py-2 text-sm transition-colors hover:bg-eleva-primary/5"
      >
        {item.name}
      </Link>
    );
  }

  // Handle separator
  if (item.type === 'separator') {
    return <hr className="my-3 border-eleva-neutral-200" />;
  }

  return null;
}
