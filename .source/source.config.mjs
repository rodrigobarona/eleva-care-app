// source.config.ts
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
var source_config_default = defineConfig({
  mdxOptions: {
    // Custom plugins can be added here (defaults are preserved)
    // remarkPlugins: [myPlugin],
    // rehypePlugins: [myPlugin],
    // Customize built-in plugin options:
    // remarkImageOptions: { placeholder: 'blur' },
    // remarkHeadingOptions: { generateToc: true },
    // rehypeCodeOptions: { themes: { light: 'github-light', dark: 'github-dark' } },
  }
});
var patient = defineDocs({
  dir: "src/content/help/patient",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
      // Enable for AI/LLM access
    }
  }
});
var expert = defineDocs({
  dir: "src/content/help/expert",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
      // Enable for AI/LLM access
    }
  }
});
var workspace = defineDocs({
  dir: "src/content/help/workspace",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
      // Enable for AI/LLM access
    }
  }
});
export {
  source_config_default as default,
  expert,
  patient,
  workspace
};
