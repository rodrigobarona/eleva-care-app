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
 * Strict whitelist regex for namespace validation
 * Allows: letters, numbers, hyphens, underscores, and forward slashes (for nested namespaces)
 * Does not allow: backslashes, dots (except in file extensions), or other special characters
 */
const SAFE_NAMESPACE_REGEX = /^[a-zA-Z0-9_/-]+$/;

/**
 * Strict whitelist regex for locale validation
 * Only allows: letters, numbers, hyphens, and underscores
 */
const SAFE_LOCALE_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates that a string contains only safe characters
 * Prevents path traversal attacks by enforcing strict whitelist
 * Namespaces can contain forward slashes for nested structures (e.g., "trust/security")
 * Locales cannot contain slashes
 */
function validateSafeString(value: string, fieldName: string): void {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
  }

  // Use different regex based on field type
  const isNamespace = fieldName.toLowerCase().includes('namespace');
  const regex = isNamespace ? SAFE_NAMESPACE_REGEX : SAFE_LOCALE_REGEX;
  const allowedChars = isNamespace
    ? 'letters, numbers, hyphens, underscores, and forward slashes'
    : 'letters, numbers, hyphens, and underscores';

  if (!regex.test(value)) {
    console.error(`Invalid ${fieldName}: "${value}"`);
    throw new Error(`Invalid ${fieldName}: only ${allowedChars} are allowed`);
  }

  // Prevent absolute paths (relative paths required for content safety)
  if (value.startsWith('/')) {
    console.error(`Absolute path not allowed in ${fieldName}: "${value}"`);
    throw new Error(`Invalid ${fieldName}: absolute paths are not allowed`);
  }
}

/**
 * Validates and normalizes a file path to prevent traversal attacks
 * Uses resolve+relative approach to detect directory escapes
 */
function validateSecurePath(constructedPath: string, baseDir: string): string {
  // Resolve both paths to absolute form
  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(constructedPath);

  // Compute relative path from base to target
  const relativePath = path.relative(resolvedBase, resolvedPath);

  // Check if path escapes the base directory
  // Invalid if: exactly '..' or starts with '../' (or '..\' on Windows)
  if (relativePath === '..' || relativePath.startsWith('..' + path.sep)) {
    console.error(
      `Path traversal attempt detected: relative path "${relativePath}" escapes base directory "${resolvedBase}"`,
    );
    throw new Error('Invalid path: attempted directory traversal detected');
  }

  return resolvedPath;
}

/**
 * Read MDX file from the filesystem
 * Handles locale fallback automatically
 * Includes path traversal protection
 */
export async function getMDXFileContent({
  namespace,
  locale,
  fallbackLocale = 'en',
}: MDXContentOptions): Promise<MDXContentResult> {
  // Validate inputs before constructing paths
  try {
    validateSafeString(namespace, 'namespace');
    validateSafeString(locale, 'locale');
    validateSafeString(fallbackLocale, 'fallbackLocale');
  } catch (error) {
    console.error('MDX file content validation failed:', error);
    return {
      content: '',
      exists: false,
      usedFallback: false,
      locale,
    };
  }

  const fileLocale = getFileLocale(locale);
  const contentDir = path.join(process.cwd(), 'content');

  // Construct and validate primary path
  const primaryPath = path.join(contentDir, namespace, `${fileLocale}.mdx`);
  let validatedPrimaryPath: string;

  try {
    validatedPrimaryPath = validateSecurePath(primaryPath, contentDir);
  } catch (error) {
    console.error('Primary path validation failed:', error);
    return {
      content: '',
      exists: false,
      usedFallback: false,
      locale: fileLocale,
    };
  }

  // Try primary locale first
  try {
    const content = await fs.readFile(validatedPrimaryPath, 'utf-8');
    return {
      content,
      exists: true,
      usedFallback: false,
      locale: fileLocale,
    };
  } catch {
    // Normalize fallback locale to file format (consistent with primary locale)
    const fallbackFileLocale = getFileLocale(fallbackLocale);
    const fallbackPath = path.join(contentDir, namespace, `${fallbackFileLocale}.mdx`);
    let validatedFallbackPath: string;

    try {
      validatedFallbackPath = validateSecurePath(fallbackPath, contentDir);
    } catch (error) {
      console.error('Fallback path validation failed:', error);
      return {
        content: '',
        exists: false,
        usedFallback: false,
        locale: fileLocale,
      };
    }

    // Try fallback locale
    try {
      const content = await fs.readFile(validatedFallbackPath, 'utf-8');
      console.warn(
        `MDX file not found for locale "${fileLocale}" in namespace "${namespace}", using fallback "${fallbackFileLocale}"`,
      );
      return {
        content,
        exists: true,
        usedFallback: true,
        locale: fallbackFileLocale,
      };
    } catch (fallbackError) {
      console.error(
        `Failed to load MDX content for namespace "${namespace}" in both "${fileLocale}" and "${fallbackFileLocale}"`,
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
 * @param remarkPlugins - Additional remark plugins to apply (remarkGfm is included by default unless present)
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
  remarkPlugins?: import('unified').PluggableList;
  rehypePlugins?: import('unified').PluggableList;
}): Promise<React.ReactElement | null> {
  const { content, exists } = await getMDXFileContent({
    namespace,
    locale,
    fallbackLocale,
  });

  if (!exists) {
    return null;
  }

  // Deduplicate remarkGfm if already included in remarkPlugins
  const hasRemarkGfm = remarkPlugins.some((plugin) => {
    // Handle both plugin and [plugin, options] formats
    const pluginFn = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginFn === remarkGfm;
  });

  const finalRemarkPlugins = hasRemarkGfm ? remarkPlugins : [remarkGfm, ...remarkPlugins];

  return (
    <MDXRemote
      source={content}
      options={{
        mdxOptions: {
          remarkPlugins: finalRemarkPlugins,
          rehypePlugins,
        },
      }}
      components={components}
    />
  );
}

/**
 * Cache for MDX namespaces to reduce filesystem I/O
 * In development: cache expires after 5 seconds for hot-reload support
 * In production: cache persists indefinitely for optimal performance
 * Note: For runtime content updates in production, set a finite TTL via environment variable
 */
let namespaceCacheValue: string[] | null = null;
let namespaceCacheTime = 0;
const NAMESPACE_CACHE_TTL =
  process.env.NODE_ENV === 'development'
    ? 5000 // 5 seconds in dev
    : parseInt(process.env.MDX_CACHE_TTL || '0', 10) || Infinity; // Configurable in prod, defaults to permanent

/**
 * Get all available MDX namespaces from the content directory
 * Useful for static generation
 * Results are cached to reduce filesystem I/O during ISR revalidations
 */
export async function getAllMDXNamespaces(): Promise<string[]> {
  const contentDir = path.join(process.cwd(), 'content');

  // Return cached result if still valid
  const now = Date.now();
  if (namespaceCacheValue && now - namespaceCacheTime < NAMESPACE_CACHE_TTL) {
    return namespaceCacheValue;
  }

  try {
    const entries = await fs.readdir(contentDir, { withFileTypes: true });
    const namespaces = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    // Update cache
    namespaceCacheValue = namespaces;
    namespaceCacheTime = now;

    return namespaces;
  } catch (error) {
    console.error('Failed to read content directory:', error);
    return [];
  }
}

/**
 * Cache for locale lists per namespace
 * In development: cache expires after 5 seconds for hot-reload support
 * In production: cache persists indefinitely for optimal performance
 * Note: For runtime content updates in production, set a finite TTL via environment variable
 */
const localesCache = new Map<string, { value: string[]; timestamp: number }>();
const LOCALES_CACHE_TTL =
  process.env.NODE_ENV === 'development'
    ? 5000 // 5 seconds in dev
    : parseInt(process.env.MDX_CACHE_TTL || '0', 10) || Infinity; // Configurable in prod, defaults to permanent

/**
 * Get all available locales for a specific namespace
 * Useful for static generation
 * Includes path traversal protection and caching
 */
export async function getAvailableLocalesForNamespace(namespace: string): Promise<string[]> {
  // Validate namespace input
  try {
    validateSafeString(namespace, 'namespace');
  } catch (error) {
    console.error('Namespace validation failed:', error);
    return [];
  }

  // Check cache
  const cached = localesCache.get(namespace);
  const now = Date.now();
  if (cached && now - cached.timestamp < LOCALES_CACHE_TTL) {
    return cached.value;
  }

  const baseDir = path.join(process.cwd(), 'content');
  const contentDir = path.join(baseDir, namespace);

  // Validate the constructed path
  try {
    validateSecurePath(contentDir, baseDir);
  } catch (error) {
    console.error('Path validation failed for namespace directory:', error);
    return [];
  }

  try {
    const files = await fs.readdir(contentDir);
    const locales = files
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => file.replace('.mdx', ''))
      .sort(); // Sort for deterministic output (useful for tests and SSG)

    // Update cache
    localesCache.set(namespace, { value: locales, timestamp: now });

    return locales;
  } catch (error) {
    console.error(`Failed to read locales for namespace "${namespace}":`, error);
    return [];
  }
}

/**
 * Check if an MDX file exists for a given namespace and locale
 * Includes path traversal protection
 */
export async function mdxFileExists(namespace: string, locale: string): Promise<boolean> {
  // Validate inputs
  try {
    validateSafeString(namespace, 'namespace');
    validateSafeString(locale, 'locale');
  } catch (error) {
    console.error('Input validation failed in mdxFileExists:', error);
    return false;
  }

  const fileLocale = getFileLocale(locale);
  const baseDir = path.join(process.cwd(), 'content');
  const filePath = path.join(baseDir, namespace, `${fileLocale}.mdx`);

  // Validate the constructed path
  try {
    const validatedPath = validateSecurePath(filePath, baseDir);
    await fs.access(validatedPath);
    return true;
  } catch {
    return false;
  }
}
