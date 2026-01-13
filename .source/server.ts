// @ts-nocheck
import * as __fd_glob_42 from "../src/content/docs/workspace/en/pricing/revenue.mdx?collection=workspaceDocs"
import * as __fd_glob_41 from "../src/content/docs/workspace/en/pricing/plans.mdx?collection=workspaceDocs"
import * as __fd_glob_40 from "../src/content/docs/workspace/en/getting-started/setup.mdx?collection=workspaceDocs"
import * as __fd_glob_39 from "../src/content/docs/workspace/en/getting-started/branding.mdx?collection=workspaceDocs"
import * as __fd_glob_38 from "../src/content/docs/workspace/en/team/invitations.mdx?collection=workspaceDocs"
import * as __fd_glob_37 from "../src/content/docs/workspace/en/team/experts.mdx?collection=workspaceDocs"
import * as __fd_glob_36 from "../src/content/docs/workspace/en/analytics/dashboard.mdx?collection=workspaceDocs"
import * as __fd_glob_35 from "../src/content/docs/workspace/en/index.mdx?collection=workspaceDocs"
import { default as __fd_glob_34 } from "../src/content/docs/workspace/en/team/meta.json?collection=workspaceMeta"
import { default as __fd_glob_33 } from "../src/content/docs/workspace/en/pricing/meta.json?collection=workspaceMeta"
import { default as __fd_glob_32 } from "../src/content/docs/workspace/en/getting-started/meta.json?collection=workspaceMeta"
import { default as __fd_glob_31 } from "../src/content/docs/workspace/en/analytics/meta.json?collection=workspaceMeta"
import { default as __fd_glob_30 } from "../src/content/docs/workspace/en/meta.json?collection=workspaceMeta"
import { default as __fd_glob_29 } from "../src/content/docs/expert/en/top-expert/meta.json?collection=expertMeta"
import { default as __fd_glob_28 } from "../src/content/docs/expert/en/earnings/meta.json?collection=expertMeta"
import { default as __fd_glob_27 } from "../src/content/docs/expert/en/getting-started/meta.json?collection=expertMeta"
import { default as __fd_glob_26 } from "../src/content/docs/expert/en/meta.json?collection=expertMeta"
import * as __fd_glob_25 from "../src/content/docs/expert/en/top-expert/requirements.mdx?collection=expertDocs"
import * as __fd_glob_24 from "../src/content/docs/expert/en/top-expert/benefits.mdx?collection=expertDocs"
import * as __fd_glob_23 from "../src/content/docs/expert/en/getting-started/services.mdx?collection=expertDocs"
import * as __fd_glob_22 from "../src/content/docs/expert/en/getting-started/profile.mdx?collection=expertDocs"
import * as __fd_glob_21 from "../src/content/docs/expert/en/getting-started/availability.mdx?collection=expertDocs"
import * as __fd_glob_20 from "../src/content/docs/expert/en/earnings/pricing.mdx?collection=expertDocs"
import * as __fd_glob_19 from "../src/content/docs/expert/en/earnings/payouts.mdx?collection=expertDocs"
import * as __fd_glob_18 from "../src/content/docs/expert/en/index.mdx?collection=expertDocs"
import { default as __fd_glob_17 } from "../src/content/docs/developer/en/webhooks/meta.json?collection=developerMeta"
import { default as __fd_glob_16 } from "../src/content/docs/developer/en/integrations/meta.json?collection=developerMeta"
import { default as __fd_glob_15 } from "../src/content/docs/developer/en/api/meta.json?collection=developerMeta"
import { default as __fd_glob_14 } from "../src/content/docs/developer/en/meta.json?collection=developerMeta"
import * as __fd_glob_13 from "../src/content/docs/developer/en/webhooks/overview.mdx?collection=developerDocs"
import * as __fd_glob_12 from "../src/content/docs/developer/en/webhooks/events.mdx?collection=developerDocs"
import * as __fd_glob_11 from "../src/content/docs/developer/en/integrations/stripe.mdx?collection=developerDocs"
import * as __fd_glob_10 from "../src/content/docs/developer/en/integrations/calendar.mdx?collection=developerDocs"
import * as __fd_glob_9 from "../src/content/docs/developer/en/api/errors.mdx?collection=developerDocs"
import * as __fd_glob_8 from "../src/content/docs/developer/en/api/endpoints.mdx?collection=developerDocs"
import * as __fd_glob_7 from "../src/content/docs/developer/en/api/authentication.mdx?collection=developerDocs"
import * as __fd_glob_6 from "../src/content/docs/developer/en/index.mdx?collection=developerDocs"
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

export const developerDocs = await create.doc("developerDocs", "src/content/docs/developer", {"en/index.mdx": __fd_glob_6, "en/api/authentication.mdx": __fd_glob_7, "en/api/endpoints.mdx": __fd_glob_8, "en/api/errors.mdx": __fd_glob_9, "en/integrations/calendar.mdx": __fd_glob_10, "en/integrations/stripe.mdx": __fd_glob_11, "en/webhooks/events.mdx": __fd_glob_12, "en/webhooks/overview.mdx": __fd_glob_13, });

export const developerMeta = await create.meta("developerMeta", "src/content/docs/developer", {"en/meta.json": __fd_glob_14, "en/api/meta.json": __fd_glob_15, "en/integrations/meta.json": __fd_glob_16, "en/webhooks/meta.json": __fd_glob_17, });

export const expertDocs = await create.doc("expertDocs", "src/content/docs/expert", {"en/index.mdx": __fd_glob_18, "en/earnings/payouts.mdx": __fd_glob_19, "en/earnings/pricing.mdx": __fd_glob_20, "en/getting-started/availability.mdx": __fd_glob_21, "en/getting-started/profile.mdx": __fd_glob_22, "en/getting-started/services.mdx": __fd_glob_23, "en/top-expert/benefits.mdx": __fd_glob_24, "en/top-expert/requirements.mdx": __fd_glob_25, });

export const expertMeta = await create.meta("expertMeta", "src/content/docs/expert", {"en/meta.json": __fd_glob_26, "en/getting-started/meta.json": __fd_glob_27, "en/earnings/meta.json": __fd_glob_28, "en/top-expert/meta.json": __fd_glob_29, });

export const patientDocs = await create.doc("patientDocs", "src/content/docs/patient", {"en/booking.mdx": __fd_glob_0, "en/faq.mdx": __fd_glob_1, "en/index.mdx": __fd_glob_2, "en/payments.mdx": __fd_glob_3, "en/reviews.mdx": __fd_glob_4, });

export const patientMeta = await create.meta("patientMeta", "src/content/docs/patient", {"en/meta.json": __fd_glob_5, });

export const workspaceDocs = await create.doc("workspaceDocs", "src/content/docs/workspace", {"en/index.mdx": __fd_glob_35, "en/analytics/dashboard.mdx": __fd_glob_36, "en/team/experts.mdx": __fd_glob_37, "en/team/invitations.mdx": __fd_glob_38, "en/getting-started/branding.mdx": __fd_glob_39, "en/getting-started/setup.mdx": __fd_glob_40, "en/pricing/plans.mdx": __fd_glob_41, "en/pricing/revenue.mdx": __fd_glob_42, });

export const workspaceMeta = await create.meta("workspaceMeta", "src/content/docs/workspace", {"en/meta.json": __fd_glob_30, "en/analytics/meta.json": __fd_glob_31, "en/getting-started/meta.json": __fd_glob_32, "en/pricing/meta.json": __fd_glob_33, "en/team/meta.json": __fd_glob_34, });