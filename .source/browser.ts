// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  clinicDocs: create.doc("clinicDocs", {}),
  developerDocs: create.doc("developerDocs", {}),
  expertDocs: create.doc("expertDocs", {"en/index.mdx": () => import("../src/content/docs/expert/en/index.mdx?collection=expertDocs"), "en/earnings/payouts.mdx": () => import("../src/content/docs/expert/en/earnings/payouts.mdx?collection=expertDocs"), "en/earnings/pricing.mdx": () => import("../src/content/docs/expert/en/earnings/pricing.mdx?collection=expertDocs"), "en/getting-started/availability.mdx": () => import("../src/content/docs/expert/en/getting-started/availability.mdx?collection=expertDocs"), "en/getting-started/profile.mdx": () => import("../src/content/docs/expert/en/getting-started/profile.mdx?collection=expertDocs"), "en/getting-started/services.mdx": () => import("../src/content/docs/expert/en/getting-started/services.mdx?collection=expertDocs"), "en/top-expert/benefits.mdx": () => import("../src/content/docs/expert/en/top-expert/benefits.mdx?collection=expertDocs"), "en/top-expert/requirements.mdx": () => import("../src/content/docs/expert/en/top-expert/requirements.mdx?collection=expertDocs"), }),
  legal: create.doc("legal", {}),
  marketing: create.doc("marketing", {}),
  patientDocs: create.doc("patientDocs", {"en/booking.mdx": () => import("../src/content/docs/patient/en/booking.mdx?collection=patientDocs"), "en/faq.mdx": () => import("../src/content/docs/patient/en/faq.mdx?collection=patientDocs"), "en/index.mdx": () => import("../src/content/docs/patient/en/index.mdx?collection=patientDocs"), "en/payments.mdx": () => import("../src/content/docs/patient/en/payments.mdx?collection=patientDocs"), "en/reviews.mdx": () => import("../src/content/docs/patient/en/reviews.mdx?collection=patientDocs"), }),
  trust: create.doc("trust", {}),
};
export default browserCollections;