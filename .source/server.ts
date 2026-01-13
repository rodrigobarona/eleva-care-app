// @ts-nocheck
import { default as __fd_glob_17 } from "../src/content/docs/expert/en/top-expert/meta.json?collection=expertMeta"
import { default as __fd_glob_16 } from "../src/content/docs/expert/en/getting-started/meta.json?collection=expertMeta"
import { default as __fd_glob_15 } from "../src/content/docs/expert/en/earnings/meta.json?collection=expertMeta"
import { default as __fd_glob_14 } from "../src/content/docs/expert/en/meta.json?collection=expertMeta"
import * as __fd_glob_13 from "../src/content/docs/expert/en/earnings/payouts.mdx?collection=expertDocs"
import * as __fd_glob_12 from "../src/content/docs/expert/en/earnings/pricing.mdx?collection=expertDocs"
import * as __fd_glob_11 from "../src/content/docs/expert/en/getting-started/profile.mdx?collection=expertDocs"
import * as __fd_glob_10 from "../src/content/docs/expert/en/getting-started/availability.mdx?collection=expertDocs"
import * as __fd_glob_9 from "../src/content/docs/expert/en/getting-started/services.mdx?collection=expertDocs"
import * as __fd_glob_8 from "../src/content/docs/expert/en/top-expert/benefits.mdx?collection=expertDocs"
import * as __fd_glob_7 from "../src/content/docs/expert/en/top-expert/requirements.mdx?collection=expertDocs"
import * as __fd_glob_6 from "../src/content/docs/expert/en/index.mdx?collection=expertDocs"
import * as __fd_glob_5 from "../src/content/docs/patient/en/payments.mdx?collection=patientDocs"
import * as __fd_glob_4 from "../src/content/docs/patient/en/reviews.mdx?collection=patientDocs"
import * as __fd_glob_3 from "../src/content/docs/patient/en/faq.mdx?collection=patientDocs"
import * as __fd_glob_2 from "../src/content/docs/patient/en/booking.mdx?collection=patientDocs"
import * as __fd_glob_1 from "../src/content/docs/patient/en/index.mdx?collection=patientDocs"
import { default as __fd_glob_0 } from "../src/content/docs/patient/en/meta.json?collection=patientMeta"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const clinicDocs = await create.doc("clinicDocs", "src/content/docs/clinic", {});

export const clinicMeta = await create.meta("clinicMeta", "src/content/docs/clinic", {});

export const developerDocs = await create.doc("developerDocs", "src/content/docs/developer", {});

export const developerMeta = await create.meta("developerMeta", "src/content/docs/developer", {});

export const expertDocs = await create.doc("expertDocs", "src/content/docs/expert", {"en/index.mdx": __fd_glob_6, "en/top-expert/requirements.mdx": __fd_glob_7, "en/top-expert/benefits.mdx": __fd_glob_8, "en/getting-started/services.mdx": __fd_glob_9, "en/getting-started/availability.mdx": __fd_glob_10, "en/getting-started/profile.mdx": __fd_glob_11, "en/earnings/pricing.mdx": __fd_glob_12, "en/earnings/payouts.mdx": __fd_glob_13, });

export const expertMeta = await create.meta("expertMeta", "src/content/docs/expert", {"en/meta.json": __fd_glob_14, "en/earnings/meta.json": __fd_glob_15, "en/getting-started/meta.json": __fd_glob_16, "en/top-expert/meta.json": __fd_glob_17, });

export const legal = await create.doc("legal", "src/content/_placeholder/legal", {});

export const marketing = await create.doc("marketing", "src/content/_placeholder/marketing", {});

export const patientDocs = await create.doc("patientDocs", "src/content/docs/patient", {"en/index.mdx": __fd_glob_1, "en/booking.mdx": __fd_glob_2, "en/faq.mdx": __fd_glob_3, "en/reviews.mdx": __fd_glob_4, "en/payments.mdx": __fd_glob_5, });

export const patientMeta = await create.meta("patientMeta", "src/content/docs/patient", {"en/meta.json": __fd_glob_0, });

export const trust = await create.doc("trust", "src/content/_placeholder/trust", {});