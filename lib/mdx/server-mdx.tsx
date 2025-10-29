import { getFileLocale } from '@/lib/i18n/utils';
import fs from 'fs/promises';
import type { MDXComponents } from 'mdx/types';
import { MDXRemote } from 'next-mdx-remote/rsc';
import path from 'path';
import React from 'react';
import remarkGfm from 'remark-gfm';

/**
 * Server-side MDX utilities for rendering MDX content
 * Uses next-mdx-remote/rsc for React Server Components
 */

interface MDXContentOptions {
  namespace: string;
  locale: string;
  fallbackLocale?: string;
}

interface MDXContentResult {
  content: string;
  exists: boolean;
  usedFallback: boolean;
  locale: string;
}

/**
 * Read MDX file from the filesystem
 * Handles locale fallback automatically
 */
export async function getMDXFileContent({
  namespace,
  locale,
  fallbackLocale = 'en',
}: MDXContentOptions): Promise<MDXContentResult> {
  const fileLocale = getFileLocale(locale);
  const contentDir = path.join(process.cwd(), 'content');

  // Try primary locale first
  const primaryPath = path.join(contentDir, namespace, `${fileLocale}.mdx`);

  try {
    const content = await fs.readFile(primaryPath, 'utf-8');
    return {
      content,
      exists: true,
      usedFallback: false,
      locale: fileLocale,
    };
  } catch {
    // Try fallback locale
    const fallbackPath = path.join(contentDir, namespace, `${fallbackLocale}.mdx`);

    try {
      const content = await fs.readFile(fallbackPath, 'utf-8');
      console.warn(
        `MDX file not found for locale "${fileLocale}" in namespace "${namespace}", using fallback "${fallbackLocale}"`,
      );
      return {
        content,
        exists: true,
        usedFallback: true,
        locale: fallbackLocale,
      };
    } catch (fallbackError) {
      console.error(
        `Failed to load MDX content for namespace "${namespace}" in both "${fileLocale}" and "${fallbackLocale}"`,
        fallbackError,
      );
      return {
        content: '',
        exists: false,
        usedFallback: false,
        locale: fileLocale,
      };
    }
  }
}

/**
 * Render MDX content as a React Server Component
 * Returns the MDXRemote component ready to be rendered
 *
 * @param remarkPlugins - Additional remark plugins to apply (remarkGfm is always included)
 * @param rehypePlugins - Rehype plugins for HTML transformation
 */
export async function renderMDXContent({
  namespace,
  locale,
  fallbackLocale = 'en',
  components = {},
  remarkPlugins = [],
  rehypePlugins = [],
}: MDXContentOptions & {
  components?: MDXComponents;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remarkPlugins?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rehypePlugins?: any[];
}): Promise<React.ReactElement | null> {
  const { content, exists } = await getMDXFileContent({
    namespace,
    locale,
    fallbackLocale,
  });

  if (!exists) {
    return null;
  }

  return (
    <MDXRemote
      source={content}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm, ...remarkPlugins],
          rehypePlugins,
        },
      }}
      components={components}
    />
  );
}

/**
 * Cache for MDX namespaces to reduce filesystem I/O
 * Cleared on dev server restart, persisted during build
 */
const namespaceCache = new Map<string, string[]>();

/**
 * Get all available MDX namespaces from the content directory
 * Useful for static generation
 * Results are cached to reduce filesystem I/O during ISR revalidations
 */
export async function getAllMDXNamespaces(): Promise<string[]> {
  const contentDir = path.join(process.cwd(), 'content');

  // Return cached result if available
  if (namespaceCache.has(contentDir)) {
    return namespaceCache.get(contentDir)!;
  }

  try {
    const entries = await fs.readdir(contentDir, { withFileTypes: true });
    const namespaces = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    // Cache the result
    namespaceCache.set(contentDir, namespaces);

    return namespaces;
  } catch (error) {
    console.error('Failed to read content directory:', error);
    return [];
  }
}

/**
 * Get all available locales for a specific namespace
 * Useful for static generation
 */
export async function getAvailableLocalesForNamespace(namespace: string): Promise<string[]> {
  const contentDir = path.join(process.cwd(), 'content', namespace);

  try {
    const files = await fs.readdir(contentDir);
    return files.filter((file) => file.endsWith('.mdx')).map((file) => file.replace('.mdx', ''));
  } catch (error) {
    console.error(`Failed to read locales for namespace "${namespace}":`, error);
    return [];
  }
}

/**
 * Check if an MDX file exists for a given namespace and locale
 */
export async function mdxFileExists(namespace: string, locale: string): Promise<boolean> {
  const fileLocale = getFileLocale(locale);
  const filePath = path.join(process.cwd(), 'content', namespace, `${fileLocale}.mdx`);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
