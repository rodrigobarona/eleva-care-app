'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Search, FileText, ArrowRight, Loader2 } from 'lucide-react';

/**
 * Search result item type
 */
interface SearchResult {
  id: string;
  type: 'page' | 'heading';
  content: string;
  url: string;
  source?: 'patient' | 'expert' | 'organization' | 'developer';
}

/**
 * Search Dialog Component
 *
 * Full-text search across all documentation portals.
 * Opens with Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 *
 * @example
 * ```tsx
 * <SearchDialog />
 * ```
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Use Fumadocs search hook
  const { search, setSearch, query } = useDocsSearch({
    type: 'fetch',
    api: '/api/search',
  });

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigate to result
  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      setSearch('');
      router.push(url);
    },
    [router, setSearch]
  );

  // Get source label and color
  const getSourceBadge = (source?: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      patient: { label: 'Patient', className: 'bg-blue-100 text-blue-800' },
      expert: { label: 'Expert', className: 'bg-green-100 text-green-800' },
      organization: { label: 'Organization', className: 'bg-purple-100 text-purple-800' },
      developer: { label: 'Developer', className: 'bg-orange-100 text-orange-800' },
    };
    return source ? badges[source] : null;
  };

  // Handle different return types from Fumadocs search
  const results: SearchResult[] = query.data && query.data !== 'empty' 
    ? (Array.isArray(query.data) ? query.data : []) as unknown as SearchResult[]
    : [];
  const isLoading = query.isLoading;

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2',
          'text-sm text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search documentation...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="sr-only">Search Documentation</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documentation..."
                className="border-0 bg-transparent p-0 text-base focus-visible:ring-0"
                autoFocus
              />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </DialogHeader>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto p-2">
            {search.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Search className="mx-auto mb-3 h-8 w-8 opacity-50" />
                <p>Type to search across all documentation</p>
                <p className="mt-1 text-xs">Patient • Expert • Organization • Developer</p>
              </div>
            ) : results.length === 0 && !isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <p>No results found for "{search}"</p>
                <p className="mt-1 text-xs">Try different keywords</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {results.map((result, index) => {
                  const badge = getSourceBadge(result.source);
                  return (
                    <li key={`${result.id}-${index}`}>
                      <button
                        onClick={() => handleSelect(result.url)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2',
                          'text-left text-sm transition-colors',
                          'hover:bg-accent'
                        )}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{result.content}</span>
                            {badge && (
                              <Badge variant="secondary" className={cn('shrink-0 text-xs', badge.className)}>
                                {badge.label}
                              </Badge>
                            )}
                          </div>
                          <span className="truncate text-xs text-muted-foreground">{result.url}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5 py-0.5">↑</kbd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5 py-0.5">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5 py-0.5">esc</kbd>
                <span>Close</span>
              </span>
            </div>
            <span>Powered by Orama</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SearchDialog;

