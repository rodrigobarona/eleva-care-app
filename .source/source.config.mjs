// source.config.ts
import {
  defineDocs,
  defineCollections,
  frontmatterSchema
} from "fumadocs-mdx/config";
import { z } from "zod";
var { docs: patientDocs, meta: patientMeta } = defineDocs({
  dir: "src/content/docs/patient"
});
var { docs: expertDocs, meta: expertMeta } = defineDocs({
  dir: "src/content/docs/expert"
});
var { docs: clinicDocs, meta: clinicMeta } = defineDocs({
  dir: "src/content/docs/clinic"
});
var { docs: developerDocs, meta: developerMeta } = defineDocs({
  dir: "src/content/docs/developer"
});
var marketingSchema = frontmatterSchema.extend({
  og: z.object({
    title: z.string(),
    description: z.string(),
    siteName: z.string().optional()
  }).optional()
});
var marketing = defineCollections({
  type: "doc",
  dir: "src/content/marketing",
  schema: marketingSchema
});
var legalSchema = frontmatterSchema.extend({
  effectiveDate: z.string().optional()
});
var legal = defineCollections({
  type: "doc",
  dir: "src/content/legal",
  schema: legalSchema
});
var trustSchema = frontmatterSchema.extend({
  lastUpdated: z.string().optional()
});
var trust = defineCollections({
  type: "doc",
  dir: "src/content/trust",
  schema: trustSchema
});
export {
  clinicDocs,
  clinicMeta,
  developerDocs,
  developerMeta,
  expertDocs,
  expertMeta,
  legal,
  marketing,
  patientDocs,
  patientMeta,
  trust
};
