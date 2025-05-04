import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import type { ImageProps } from 'next/image';
import Link from 'next/link';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
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
      <p className="mb-4 text-balance font-light leading-7 text-eleva-neutral-900 lg:text-lg">
        {children}
      </p>
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
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm text-eleva-neutral-900 data-[dark]:text-eleva-neutral-100">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-6 overflow-auto rounded-md bg-muted p-4 font-mono text-sm text-eleva-neutral-900 data-[dark]:text-eleva-neutral-100">
        {children}
      </pre>
    ),

    // Table elements
    table: ({ children }) => (
      <div className="my-6 w-full overflow-y-auto">
        <table className="w-full border-collapse text-sm text-eleva-neutral-900">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b bg-muted/50">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y">{children}</tbody>,
    tr: ({ children }) => <tr className="m-0 border-t p-0 even:bg-muted/50">{children}</tr>,
    th: ({ children }) => (
      <th className="border px-4 py-2 text-left font-mono text-xs font-semibold uppercase tracking-widest text-eleva-neutral-900/70">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border px-4 py-2 text-left font-light text-eleva-neutral-900">{children}</td>
    ),

    // Merge with existing components
    ...components,
  };
}
