import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import type { ImageProps } from 'next/image';
import Link from 'next/link';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings
    h1: ({ children }) => (
      <h1 className="mb-6 mt-8 text-4xl font-bold tracking-tight">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-6 text-3xl font-bold tracking-tight">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-5 text-2xl font-semibold tracking-tight">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-4 text-xl font-semibold tracking-tight">{children}</h4>
    ),

    // Text elements
    p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-primary/30 pl-4 italic">{children}</blockquote>
    ),

    // Lists
    ul: ({ children }) => <ul className="mb-6 list-disc space-y-2 pl-6">{children}</ul>,
    ol: ({ children }) => <ol className="mb-6 list-decimal space-y-2 pl-6">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,

    // Links
    a: ({ href, children }) => (
      <Link href={href || '#'} className="font-medium text-primary hover:underline">
        {children}
      </Link>
    ),

    // Images - with next/image optimization
    img: (props) => {
      // Extract src and alt, with rest containing the remaining props
      const { src, alt = '', ...rest } = props as ImageProps & { src: string };

      return (
        <Image
          className="my-6 rounded-md"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ width: '100%', height: 'auto' }}
          src={src}
          alt={alt}
          {...rest}
        />
      );
    },

    // Code elements
    code: ({ children }) => (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm text-muted-foreground">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-6 overflow-auto rounded-md bg-muted p-4 text-sm">{children}</pre>
    ),

    // Table elements
    table: ({ children }) => (
      <div className="my-6 w-full overflow-y-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b bg-muted/50">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y">{children}</tbody>,
    tr: ({ children }) => <tr className="m-0 border-t p-0 even:bg-muted/50">{children}</tr>,
    th: ({ children }) => <th className="border px-4 py-2 text-left font-bold">{children}</th>,
    td: ({ children }) => <td className="border px-4 py-2 text-left">{children}</td>,

    // Merge with existing components
    ...components,
  };
}
