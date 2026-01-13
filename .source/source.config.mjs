// source.config.ts
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
var source_config_default = defineConfig({
  mdxOptions: {
    // Add remark-gfm for GitHub Flavored Markdown support
    remarkPlugins: [],
    rehypePlugins: []
  }
});
var { docs: patientDocs, meta: patientMeta } = defineDocs({
  dir: "src/content/docs/patient"
});
var { docs: expertDocs, meta: expertMeta } = defineDocs({
  dir: "src/content/docs/expert"
});
var { docs: workspaceDocs, meta: workspaceMeta } = defineDocs({
  dir: "src/content/docs/workspace"
});
var { docs: developerDocs, meta: developerMeta } = defineDocs({
  dir: "src/content/docs/developer"
});
export {
  source_config_default as default,
  developerDocs,
  developerMeta,
  expertDocs,
  expertMeta,
  patientDocs,
  patientMeta,
  workspaceDocs,
  workspaceMeta
};
