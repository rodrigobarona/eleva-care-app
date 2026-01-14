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
  dir: "src/content/docs/patient",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
      // Enable for AI/LLM access
    }
  }
});
var expert = defineDocs({
  dir: "src/content/docs/expert",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
      // Enable for AI/LLM access
    }
  }
});
var workspace = defineDocs({
  dir: "src/content/docs/workspace",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
      // Enable for AI/LLM access
    }
  }
});
var developer = defineDocs({
  dir: "src/content/docs/developer",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
      // Enable for AI/LLM access
    }
  }
});
export {
  source_config_default as default,
  developer,
  expert,
  patient,
  workspace
};
