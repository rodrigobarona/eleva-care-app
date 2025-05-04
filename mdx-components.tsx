import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import type { ImageProps } from 'next/image';
import Link from 'next/link';

// Use Design System for MDX components
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings - Using Serif font for primary headings with text balance
    h1: ({ children }) => (
      <h1 className="mb-6 mt-8 text-balance font-serif text-4xl font-bold tracking-tight text-eleva-primary">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-6 text-balance font-serif text-3xl font-bold tracking-tight text-eleva-primary">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-5 font-serif text-2xl font-semibold tracking-tight text-eleva-neutral-900">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-4 font-serif text-xl font-semibold tracking-tight text-eleva-neutral-900">
        {children}
      </h4>
    ),

    // Text elements - Using Sans-Serif for body copy
    p: ({ children }) => (
      <p className="text-elevaNeutral-900 mb-4 font-sans leading-7">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-elevaPrimary text-elevaNeutral-900 my-6 border-l-4 pl-4 italic">
        {children}
      </blockquote>
    ),

    // Lists
    ul: ({ children }) => (
      <ul className="text-elevaNeutral-900 mb-6 list-disc space-y-2 pl-6">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="text-elevaNeutral-900 mb-6 list-decimal space-y-2 pl-6">{children}</ol>
    ),
    li: ({ children }) => <li className="mb-1 font-sans">{children}</li>,

    // Links - Using elevaPrimary color with proper focus states for accessibility
    a: ({ href, children }) => (
      <Link
        href={href || '#'}
        className="text-elevaPrimary focus:ring-elevaPrimary font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        {children}
      </Link>
    ),

    // Images - with next/image optimization and proper alt text for accessibility
    img: (props) => {
      // Extract src and alt, with rest containing the remaining props
      const { src, alt = '', ...rest } = props as ImageProps & { src: string };

      return (
        <div className="my-6">
          <Image
            className="rounded-md"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ width: '100%', height: 'auto' }}
            src={src}
            alt={alt}
            {...rest}
          />
        </div>
      );
    },

    // Code elements - Using Monospace font
    code: ({ children }) => (
      <code className="bg-elevaNeutral-200 text-elevaNeutral-900 rounded px-1 py-0.5 font-mono text-sm">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-elevaNeutral-200 text-elevaNeutral-900 my-6 overflow-auto rounded-md p-4 font-mono text-sm">
        {children}
      </pre>
    ),

    // Table elements with appropriate styling and accessibility
    table: ({ children }) => (
      <div className="my-6 w-full overflow-y-auto">
        <table className="text-elevaNeutral-900 w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-elevaNeutral-200 border-b">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-elevaNeutral-200 divide-y">{children}</tbody>,
    tr: ({ children }) => (
      <tr className="even:bg-elevaNeutral-200/50 m-0 border-t p-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="border-elevaNeutral-200 border px-4 py-2 text-left font-bold" scope="col">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-elevaNeutral-200 border px-4 py-2 text-left">{children}</td>
    ),

    // Special elements for highlighting
    strong: ({ children }) => (
      <strong className="text-elevaPrimary font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="text-elevaNeutral-900 italic">{children}</em>,

    // Merge with existing components
    ...components,
  };
}
