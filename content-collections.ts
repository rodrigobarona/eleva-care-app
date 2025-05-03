import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMDX } from '@content-collections/mdx';

// Define the about collection
const about = defineCollection({
  name: 'about',
  directory: 'content/about',
  include: '**/*.mdx',
  schema: (z) => ({
    title: z.string(),
    description: z.string().optional(),
    // Add any other frontmatter fields you're using in your MDX files
  }),
  transform: async (document, context) => {
    // Compile MDX content to a component
    const mdx = await compileMDX(context, document);
    return {
      ...document,
      mdx,
    };
  },
});

// You can define additional collections here if needed
// For example, if you have a blog or other content types

export default defineConfig({
  collections: [about],
  // Add more collections as needed
});
