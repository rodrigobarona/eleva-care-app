import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import type { ImageProps } from 'next/image';
import Link from 'next/link';
import type { TdHTMLAttributes, ThHTMLAttributes } from 'react';

/**
 * Base MDX components with custom styling
 * Can be used directly in server components without hooks
 */
export const mdxComponents: MDXComponents = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mb-6 mt-8 text-balance font-serif text-4xl/[0.9] font-light tracking-tight text-eleva-primary md:text-5xl/[0.9] lg:text-6xl/[0.9]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-4 mt-6 text-balance font-serif text-3xl font-light tracking-tight text-eleva-primary md:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-3 mt-5 text-balance font-sans text-xl font-normal tracking-tight text-eleva-neutral-900 md:text-2xl">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 font-mono text-lg font-medium tracking-tight text-eleva-neutral-900/80">
      {children}
    </h4>
  ),

  // Text elements
  p: ({ children }) => (
    <p className="mb-4 font-light leading-7 text-eleva-neutral-900 lg:text-lg">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-eleva-primary/30 pl-4 italic text-eleva-neutral-900/80">
      {children}
    </blockquote>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="mb-6 list-disc space-y-2 pl-6 text-eleva-neutral-900">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-6 list-decimal space-y-2 pl-6 text-eleva-neutral-900">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1 font-light">{children}</li>,

  // Links
  a: ({ href, children }) => (
    <Link
      href={href || '#'}
      className="font-medium text-eleva-primary underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  ),

  // Images - with next/image optimization
  img: (props) => {
    // Extract src and alt, with rest containing the remaining props
    const { src, alt = '', ...rest } = props as ImageProps & { src: string };

    return (
      <div className="my-6 overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 outline-black/10">
        <Image
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          src={src}
          alt={alt}
          {...rest}
        />
      </div>
    );
  },

  // Code elements
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm text-eleva-neutral-900">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-auto rounded-md bg-muted p-4 font-mono text-sm text-eleva-neutral-900">
      {children}
    </pre>
  ),

  // Table elements
  table: ({ children, ...props }) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm text-eleva-neutral-900" {...props}>
        {children}
      </table>
    </div>
  ),
  caption: ({ children, ...props }) => (
    <caption
      className="text-eleva-neutral-700 mb-2 text-left font-sans text-xs font-medium"
      {...props}
    >
      {children}
    </caption>
  ),
  thead: ({ children, ...props }) => (
    <thead className="sticky top-0 z-10 border-b bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="divide-y" {...props}>
      {children}
    </tbody>
  ),
  tfoot: ({ children, ...props }) => (
    <tfoot className="border-t bg-muted/30" {...props}>
      {children}
    </tfoot>
  ),
  tr: ({ children, ...props }) => (
    <tr className="m-0 border-t p-0 even:bg-muted/50" {...props}>
      {children}
    </tr>
  ),
  th: ({
    children,
    align,
    ...props
  }: {
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right';
  } & ThHTMLAttributes<HTMLTableHeaderCellElement>) => {
    const alignClass =
      align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
    return (
      <th
        className={`border px-4 py-2 ${alignClass} font-mono text-xs font-semibold uppercase tracking-widest text-eleva-neutral-900/70`}
        {...props}
      >
        {children}
      </th>
    );
  },
  td: ({
    children,
    align,
    ...props
  }: {
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right';
  } & TdHTMLAttributes<HTMLTableDataCellElement>) => {
    const alignClass =
      align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
    return (
      <td className={`border px-4 py-2 ${alignClass} font-light text-eleva-neutral-900`} {...props}>
        {children}
      </td>
    );
  },
};

/**
 * MDX component merger function
 * Merges base components with custom overrides
 *
 * Note: Named "useMDXComponents" to follow MDX/Next.js conventions,
 * though it's not a React Hook (no hook rules apply).
 * This naming is expected by @next/mdx and maintains API compatibility.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...mdxComponents,
    ...components,
  };
}
