import { patientSource } from '@/lib/source';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Patient Help Center Layout
 *
 * Simple sidebar layout for patient documentation.
 * Uses Fumadocs Core for navigation tree without Fumadocs UI.
 */

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function PatientDocsLayout({
  children,
  params,
}: LayoutProps) {
  const { lang } = await params;
  const tree = patientSource.pageTree[lang] ?? patientSource.pageTree.en;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-72 border-r border-border bg-background">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="font-semibold">
            ← Back to Eleva Care
          </Link>
        </div>
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Patient Help Center
          </h2>
          <nav className="space-y-1">
            <NavigationTree tree={tree} lang={lang} />
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-72 flex-1">{children}</div>
    </div>
  );
}

/**
 * Recursive navigation tree component
 */
function NavigationTree({
  tree,
  lang,
}: {
  tree: {
    name: string;
    url?: string;
    children?: typeof tree[];
  };
  lang: string;
}) {
  if (!tree) return null;

  // Handle array of items
  if (Array.isArray(tree)) {
    return (
      <>
        {tree.map((item, index) => (
          <NavigationTree key={item.url || index} tree={item} lang={lang} />
        ))}
      </>
    );
  }

  // Handle folder with children
  if (tree.children && tree.children.length > 0) {
    return (
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-muted-foreground">
          {tree.name}
        </div>
        <div className="ml-2 space-y-1 border-l border-border pl-3">
          {tree.children.map((child, index) => (
            <NavigationTree
              key={child.url || index}
              tree={child}
              lang={lang}
            />
          ))}
        </div>
      </div>
    );
  }

  // Handle leaf page
  if (tree.url) {
    const url = lang === 'en' ? tree.url : `/${lang}${tree.url}`;
    return (
      <Link
        href={url}
        className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {tree.name}
      </Link>
    );
  }

  return null;
}
