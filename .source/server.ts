// @ts-nocheck
import { default as __fd_glob_25 } from "../src/content/docs/expert/en/top-expert/meta.json?collection=expertMeta"
import { default as __fd_glob_24 } from "../src/content/docs/expert/en/getting-started/meta.json?collection=expertMeta"
import { default as __fd_glob_23 } from "../src/content/docs/expert/en/earnings/meta.json?collection=expertMeta"
import { default as __fd_glob_22 } from "../src/content/docs/expert/en/meta.json?collection=expertMeta"
import * as __fd_glob_21 from "../src/content/docs/expert/en/top-expert/requirements.mdx?collection=expertDocs"
import * as __fd_glob_20 from "../src/content/docs/expert/en/top-expert/benefits.mdx?collection=expertDocs"
import * as __fd_glob_19 from "../src/content/docs/expert/en/getting-started/services.mdx?collection=expertDocs"
import * as __fd_glob_18 from "../src/content/docs/expert/en/getting-started/profile.mdx?collection=expertDocs"
import * as __fd_glob_17 from "../src/content/docs/expert/en/getting-started/availability.mdx?collection=expertDocs"
import * as __fd_glob_16 from "../src/content/docs/expert/en/earnings/pricing.mdx?collection=expertDocs"
import * as __fd_glob_15 from "../src/content/docs/expert/en/earnings/payouts.mdx?collection=expertDocs"
import * as __fd_glob_14 from "../src/content/docs/expert/en/index.mdx?collection=expertDocs"
import * as __fd_glob_13 from "../src/content/trust/security/pt.mdx?collection=trust"
import * as __fd_glob_12 from "../src/content/trust/security/pt-BR.mdx?collection=trust"
import * as __fd_glob_11 from "../src/content/trust/security/es.mdx?collection=trust"
import * as __fd_glob_10 from "../src/content/trust/security/en.mdx?collection=trust"
import * as __fd_glob_9 from "../src/content/trust/dpa/pt.mdx?collection=trust"
import * as __fd_glob_8 from "../src/content/trust/dpa/pt-BR.mdx?collection=trust"
import * as __fd_glob_7 from "../src/content/trust/dpa/es.mdx?collection=trust"
import * as __fd_glob_6 from "../src/content/trust/dpa/en.mdx?collection=trust"
import { default as __fd_glob_5 } from "../src/content/docs/patient/en/meta.json?collection=patientMeta"
import * as __fd_glob_4 from "../src/content/docs/patient/en/reviews.mdx?collection=patientDocs"
import * as __fd_glob_3 from "../src/content/docs/patient/en/payments.mdx?collection=patientDocs"
import * as __fd_glob_2 from "../src/content/docs/patient/en/index.mdx?collection=patientDocs"
import * as __fd_glob_1 from "../src/content/docs/patient/en/faq.mdx?collection=patientDocs"
import * as __fd_glob_0 from "../src/content/docs/patient/en/booking.mdx?collection=patientDocs"
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

export const expertDocs = await create.doc("expertDocs", "src/content/docs/expert", {"en/index.mdx": __fd_glob_14, "en/earnings/payouts.mdx": __fd_glob_15, "en/earnings/pricing.mdx": __fd_glob_16, "en/getting-started/availability.mdx": __fd_glob_17, "en/getting-started/profile.mdx": __fd_glob_18, "en/getting-started/services.mdx": __fd_glob_19, "en/top-expert/benefits.mdx": __fd_glob_20, "en/top-expert/requirements.mdx": __fd_glob_21, });

export const expertMeta = await create.meta("expertMeta", "src/content/docs/expert", {"en/meta.json": __fd_glob_22, "en/earnings/meta.json": __fd_glob_23, "en/getting-started/meta.json": __fd_glob_24, "en/top-expert/meta.json": __fd_glob_25, });

export const legal = await create.doc("legal", "src/content/legal", {});

export const marketing = await create.doc("marketing", "src/content/marketing", {});

export const patientDocs = await create.doc("patientDocs", "src/content/docs/patient", {"en/booking.mdx": __fd_glob_0, "en/faq.mdx": __fd_glob_1, "en/index.mdx": __fd_glob_2, "en/payments.mdx": __fd_glob_3, "en/reviews.mdx": __fd_glob_4, });

export const patientMeta = await create.meta("patientMeta", "src/content/docs/patient", {"en/meta.json": __fd_glob_5, });

export const trust = await create.doc("trust", "src/content/trust", {"dpa/en.mdx": __fd_glob_6, "dpa/es.mdx": __fd_glob_7, "dpa/pt-BR.mdx": __fd_glob_8, "dpa/pt.mdx": __fd_glob_9, "security/en.mdx": __fd_glob_10, "security/es.mdx": __fd_glob_11, "security/pt-BR.mdx": __fd_glob_12, "security/pt.mdx": __fd_glob_13, });