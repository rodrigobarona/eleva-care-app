import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import type { ImageProps } from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Fumadocs MDX Components
 *
 * Custom MDX components for documentation pages (/docs/*).
 * Extends Fumadocs defaults to preserve ToC anchors, Callouts, and syntax highlighting.
 *
 * REQUIRES: docs.css loaded (provides fd-* CSS variables)
 *
 * @see https://fumadocs.vercel.app/docs/ui/mdx
 */

// =============================================================================
// CUSTOM COMPONENTS
// =============================================================================

/**
 * Custom image component with Next.js optimization
 */
function DocsImage(props: ImageProps & { src: string }) {
  const { src, alt = '', width, height, ...rest } = props;

  if (width && height) {
    return (
      <div className="my-6 overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
        <Image
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          src={src}
          alt={alt}
          width={width}
          height={height}
          {...rest}
        />
      </div>
    );
  }

  return (
    <div className="relative my-6 aspect-video overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
      <Image
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        src={src}
        alt={alt}
        fill
        {...rest}
      />
    </div>
  );
}

/**
 * Smart link component with external link handling
 */
function DocsLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const actualHref = href || '#';

  // External links
  if (actualHref.startsWith('http://') || actualHref.startsWith('https://')) {
    return (
      <a href={actualHref} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }

  // Special protocol links (mailto, tel, hash)
  if (
    actualHref.startsWith('mailto:') ||
    actualHref.startsWith('tel:') ||
    actualHref.startsWith('#')
  ) {
    return (
      <a href={actualHref} {...props}>
        {children}
      </a>
    );
  }

  // Internal links use Next.js Link
  return (
    <Link href={actualHref} {...props}>
      {children}
    </Link>
  );
}

/**
 * Cards container with Eleva branding
 * Uses fd-* classes that require Fumadocs CSS
 */
function DocsCards({ children }: { children: ReactNode }) {
  return <div className="not-prose my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

/**
 * Card component with Eleva branding
 * Uses fd-* classes that require Fumadocs CSS
 */
function DocsCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border-fd-border hover:border-eleva-primary hover:bg-fd-accent/50 group block rounded-lg border p-4 no-underline transition-colors"
    >
      <h3 className="text-fd-foreground group-hover:text-eleva-primary mb-2 font-semibold">
        {title}
      </h3>
      <p className="text-fd-muted-foreground text-sm">{children}</p>
    </Link>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * MDX components for Fumadocs documentation pages
 *
 * Extends Fumadocs defaults to preserve:
 * - Heading IDs for ToC navigation
 * - Built-in Callout, Accordion, Steps, etc.
 * - Code syntax highlighting with Shiki
 *
 * Custom overrides:
 * - Cards/Card: Eleva-branded grid cards
 * - img: Next.js Image optimization
 * - a: External link handling
 */
export const docsMdxComponents: MDXComponents = {
  // Spread Fumadocs defaults FIRST (includes headings with IDs, Callout, etc.)
  ...defaultMdxComponents,

  // Override specific components with Eleva branding
  Cards: DocsCards,
  Card: DocsCard,
  img: DocsImage as MDXComponents['img'],
  a: DocsLink,
};

/**
 * Get docs MDX components with optional overrides
 */
export function getDocsMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...docsMdxComponents,
    ...components,
  };
}

