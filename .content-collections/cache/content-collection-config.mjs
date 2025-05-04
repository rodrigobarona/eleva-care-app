// content-collections.ts
import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
var about = defineCollection({
  name: "about",
  directory: "content/about",
  include: "**/*.mdx",
  schema: (z) => ({
    title: z.string(),
    description: z.string().optional()
    // Add any other frontmatter fields you're using in your MDX files
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document);
    return {
      ...document,
      mdx
    };
  }
});
var content_collections_default = defineConfig({
  collections: [about]
  // Add more collections as needed
});
export {
  content_collections_default as default
};
