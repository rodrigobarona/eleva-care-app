// source.config.ts
import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema
} from "fumadocs-mdx/config";
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
var marketing = defineCollections({
  type: "doc",
  dir: "src/content/_placeholder/marketing",
  // Non-existent, returns empty
  schema: frontmatterSchema
});
var legal = defineCollections({
  type: "doc",
  dir: "src/content/_placeholder/legal",
  // Non-existent, returns empty
  schema: frontmatterSchema
});
var trust = defineCollections({
  type: "doc",
  dir: "src/content/_placeholder/trust",
  // Non-existent, returns empty
  schema: frontmatterSchema
});
export {
  source_config_default as default,
  developerDocs,
  developerMeta,
  expertDocs,
  expertMeta,
  legal,
  marketing,
  patientDocs,
  patientMeta,
  trust,
  workspaceDocs,
  workspaceMeta
};
