import React from "react";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/atoms/card";

const legalDocs = {
  terms: {
    title: "Terms of Service",
    content: `# Terms of Service

_Last Updated:_ January 27, 2025

## 1. Introduction

Welcome to Eleva.care! These Terms of Service ("Terms") govern your access to and use of our website, platform, and services (collectively, the "Services"). By accessing or using the Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not access or use the Services.

## 2. Eligibility

The Services are intended for use by businesses and individuals in the healthcare industry. By using the Services, you represent and warrant that you are authorized to enter into these Terms on behalf of yourself or the entity you represent.

## 3. Account Creation and Security

To access certain features of the Services, you may be required to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access or use of your account.

## 4. Use of Services

You agree to use the Services only for lawful purposes and in compliance with these Terms and all applicable laws and regulations. You shall not use the Services to transmit any content that is unlawful, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.

## 5. Payments

If you purchase any paid Services, you agree to pay the applicable fees as described on our website. All fees are non-refundable unless otherwise stated in writing. Payments are processed through Stripe, and their [Payment Method Terms](https://stripe.com/en-pt/legal/payment-method-terms) apply.

## 6. Intellectual Property

The Services and all content and materials included therein, including but not limited to text, graphics, logos, images, and software, are the property of Eleva.care or its licensors and are protected by copyright and other intellectual property laws.

## 7. Privacy

Your use of the Services is subject to our [Privacy Policy](https://eleva.care/privacy). By using the Services, you consent to the collection, use, and disclosure of your personal data as described in our Privacy Policy. Our processing of your data is governed by our [Data Processing Agreement](https://neon.tech/dpa). We use Clerk for user management, and their [Privacy Policy](https://clerk.com/legal/privacy) and [Data Processing Addendum](https://clerk.com/legal/dpa) apply. For user authentication, we use Google OAuth 2.0, and their [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies) apply. We also use Beehiiv for our newsletter, and their [Privacy Policy](https://beehiiv.com/privacy), [Publisher Agreement](https://beehiiv.com/pa), and [Acceptable Use Policy](https://beehiiv.com/aup) apply.

## 8. Third-Party Services

The Services may integrate with third-party services. Your use of these third-party services is subject to their respective terms and policies. We are not responsible for the practices of these third-party services.

## 9. Disclaimer of Warranties

The Services are provided "as is" without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.

## 10. Limitation of Liability

To the maximum extent permitted by law, Eleva.care shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Services; (ii) any conduct or content of any third party on the Services; or (iii) unauthorized access, use, or alteration of your transmissions or content. Vercel's [Terms of Service](https://vercel.com/legal/terms) and [Data Processing Agreement](https://vercel.com/legal/dpa) also apply to our use of their hosting services. Refer also to Neon's [Terms of Service](https://neon.tech/terms-of-service) for provisions related to database services and Clerk's [Website Terms of Use](https://clerk.com/legal/terms) for provisions concerning their platform. Stripe's [Stripe Services Agreement — United States](https://stripe.com/legal/ssa) and [Stripe Connected Account Agreement](https://stripe.com/legal/connect-account) apply to our use of their payment processing services. Beehiiv's [Terms of Use](https://www.beehiiv.com/tou) provides additional context about their newsletter platform.

## 11. Indemnification

You agree to indemnify and hold harmless Eleva.care and its affiliates, officers, directors, employees, and agents from any and all claims, liabilities, damages, losses, or expenses, including attorneys' fees and costs, arising out of or in any way connected with your access to or use of the Services, your violation of these Terms, or your infringement of any third-party rights.

## 12. Term and Termination

These Terms shall remain in full force and effect while you use the Services. We may terminate your access to the Services at any time for any reason, including your breach of these Terms.

## 13. Governing Law

These Terms shall be governed by and construed in accordance with the laws of Portugal, without regard to its conflict of laws principles.

## 14. Changes to these Terms

We may revise these Terms at any time by posting an updated version on our website. Your continued use of the Services following any changes to these Terms constitutes your acceptance of the revised Terms.

## 15. Contact Us

If you have any questions about these Terms, please contact us at [support@eleva.care](mailto:support@eleva.care) or [+351 931897950](tel:+351931897950).
`,
  },
  privacy: {
    title: "Privacy Policy",
    content: `# Privacy Policy for Eleva.care

_Last Updated:_ January 27, 2025

## 1. Introduction

Búzios e Tartarugas, Lda. ("Eleva.care," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you use our website and services.

## 2. Information We Collect

- **Information You Provide Directly:** When you register for an account, schedule a meeting, or contact us, we collect your name, email, phone number, health information, and IP address.
- **Information We Collect Automatically:** We use cookies and Google services to collect data about your usage of our website and services, including your IP address and device information.
- **Information We Collect from Third Parties:** We may receive information about you from our partners or service providers.

## 3. How We Use Your Information

We use your information to:

- Provide and improve our services.
- Communicate with you.
- Personalize your experience.
- Comply with legal obligations.

## 4. How We Share Your Information

We may share your information with:

- Service providers who assist us in providing our services.
- Partners with whom we offer joint services.
- Legal authorities as required by law.

## 5. Data Security

We implement appropriate security measures to protect your information. However, no data transmission over the internet or electronic storage is 100% secure.

## 6. Data Retention

We retain your information only as long as necessary to fulfill the purposes for which it was collected.

## 7. Your Rights

You have the right to access, rectify, erase, restrict, and object to the processing of your personal information.

## 8. International Data Transfers

Your information may be transferred to and processed in countries outside the European Economic Area, including the United States. We comply with applicable data transfer regulations.

## 9. Third-Party Services

Our services integrate with third-party services like Neon.tech, Clerk.com, Stripe, Vercel, Google Cloud, and Beehiiv.com. Their privacy policies apply to their respective services.

## 10. Contact Us

If you have any questions about this Privacy Policy, please contact us at support@eleva.care or +351 931897950.

## Additional Clauses (GDPR Specific):

- **Lawful Basis for Processing:** We process your data based on your consent, contract fulfillment, legal obligations, and legitimate interests.
- **Data Subject Rights:** You have the right to access, rectify, erase, restrict, and object to the processing of your data. You also have the right to data portability.
- **International Data Transfers:** We use appropriate safeguards, such as Standard Contractual Clauses, for international data transfers.
- **Automated Decision-Making:** We may use automated decision-making in certain cases. You have the right to object to this.

This Privacy Policy is subject to change. Please check back regularly for updates.
`,
  },
  dpa: {
    title: "Data Processing Agreement",
    content: `# Data Processing Agreement (DPA) between Búzios e Tartarugas, Lda. (Eleva.care) and Data Processors

_Last Updated:_ January 27, 2025

## Parties:

**Data Controller:** 
- Búzios e Tartarugas, Lda. (Eleva.care), Rua Gil Vicente, 2 - 2775-198 Parede (Portugal), VAT Number: PT515001708

**Data Processors:**

- Neon Inc., 2261 Market Street STE 22601 San Francisco, CA, 94114, USA
- Clerk, Inc., 660 King Street Unit 345 San Francisco, CA 94107 United States
- Stripe, Inc. 510 Townsend St., San Francisco, CA United States
- Google LLC 1600 Amphitheatre Parkway, Mountain View, CA 94043 United States

## 1. Subject Matter and Purpose of Processing

This DPA governs the processing of personal data by the Data Processors on behalf of the Data Controller in connection with the provision of the following services:

- **Neon:** Database services for storing appointment data, synchronized with Clerk.
- **Clerk:** User management services.
- **Stripe:** Payment processing and storage of payment method data.
- **Google Cloud:** Single Sign-On (SSO) services.

The purpose of processing is to facilitate the operation of Eleva.care's platform and services, including user authentication, appointment management, and payment processing.

## 2. Data Controller's Responsibilities

Eleva.care, as the Data Controller, shall:

- Comply with all applicable data protection laws, including GDPR.
- Provide clear and accurate instructions to the Data Processors regarding the processing of personal data.
- Obtain and maintain all necessary consents from data subjects for the processing of their personal data.
- Implement appropriate technical and organizational measures to ensure the security of personal data.

## 3. Data Processors' Responsibilities

The Data Processors shall:

- Process personal data only on documented instructions from the Data Controller.
- Implement appropriate technical and organizational security measures to protect personal data against unauthorized access, use, disclosure, alteration, or destruction.
- Assist the Data Controller in fulfilling its obligations under GDPR, including responding to data subject requests.
- Notify the Data Controller without undue delay of any personal data breaches.
- Engage sub-processors only with the prior written consent of the Data Controller. [Include details about sub-processor management based on the relevant DPA clauses from Neon, Clerk, etc.]

## 4. Data Security

The Data Processors shall implement and maintain appropriate technical and organizational security measures, as detailed in their respective security documentation and DPAs (referenced below).

## 5. International Data Transfers

All personal data will be stored and processed within the European Union, specifically at the Frankfurt edge point. Data transfers between EU member states will be carried out in compliance with GDPR requirements for intra-EU transfers.

## 6. Data Subject Requests

The Data Processors shall assist the Data Controller in responding to data subject requests, as detailed in their respective DPAs.

## 7. Term and Termination

This DPA shall remain in effect for the duration of the Agreement between Eleva.care and the respective Data Processors.

## 8. Governing Law

This DPA shall be governed by and construed in accordance with the laws of Portugal.

## 9. References of the Data Processing Agreement

- **Neon:** [https://neon.tech/dpa](https://neon.tech/dpa)
- **Clerk:** [https://clerk.com/legal/dpa](https://clerk.com/legal/dpa)
- **Stripe:** [https://stripe.com/legal/dpa](https://stripe.com/legal/dpa)
- **Google Cloud:** [https://cloud.google.com/terms/data-processing-addendum](https://cloud.google.com/terms/data-processing-addendum)
`,
  },
};

export default function LegalPage({
  params: { document },
}: {
  params: { document: keyof typeof legalDocs };
}) {
  const doc = legalDocs[document];

  if (!doc) {
    return notFound();
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="p-6 sm:p-10">
        <ReactMarkdown className="prose prose-slate max-w-none">
          {doc.content}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
}
