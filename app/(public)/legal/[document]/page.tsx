import { Card, CardContent } from '@/components/atoms/card';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

const legalDocs = {
  terms: {
    title: 'Terms of Service',
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

Your use of the Services is subject to our [Privacy Policy](https://eleva.care/privacy). By using the Services, you consent to the collection, use, and disclosure of your personal data as described in our Privacy Policy. Our processing of your data is governed by our [Data Processing Agreement](https://eleva.care/legal/dpa). We use Clerk for user management, and their [Privacy Policy](https://clerk.com/legal/privacy) and [Data Processing Addendum](https://clerk.com/legal/dpa) apply. For user authentication, we use Google OAuth 2.0, and their [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies) apply. We also use Beehiiv for our newsletter, and their [Privacy Policy](https://beehiiv.com/privacy), [Publisher Agreement](https://beehiiv.com/pa), and [Acceptable Use Policy](https://beehiiv.com/aup) apply.

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

## 16. Technology Stack and Sub-Listing Process

Eleva is built using modern technologies including Next.js 14 with the App Router, React for building dynamic user interfaces, and Tailwind CSS with shadcn/ui for responsive design. We use Clerk for secure authentication, PostgreSQL with Drizzle ORM for efficient database management, and Stripe Connect for secure payment processing. Our platform also integrates Google Calendar for scheduling and Beehiiv for newsletter services. The sub-listing process employed on our platform ensures accurate and efficient organization of appointment listings and expert profiles.
`,
  },
  privacy: {
    title: 'Privacy Policy',
    content: `# Privacy Policy for Eleva.care

_Last Updated:_ January 27, 2025

## 1. Introduction

Búzios e Tartarugas, Lda. ("Eleva.care," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you use our website and services. For the provision of our Services, Eleva leverages a modern technology stack including Next.js 14, Clerk for authentication, PostgreSQL with Drizzle ORM for database management, and Tailwind CSS with shadcn/ui for interface design. Our sub-listing process ensures accurate synchronization of appointment data and expert profiles.

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

Our services integrate with third-party services like Neon.tech, Clerk.com, Stripe, Vercel, Google Cloud, and Beehiiv.com. Their respective privacy policies apply.

## 10. Contact Us

If you have any questions about this Privacy Policy, please contact us at [support@eleva.care](mailto:support@eleva.care) or call +351 931897950.

## Additional Clauses (GDPR Specific):

- **Lawful Basis for Processing:** We process your data based on your consent, contract fulfillment, legal obligations, and legitimate interests.
- **Data Subject Rights:** You have the right to access, rectify, erase, restrict, and object to the processing of your data. You also have the right to data portability.
- **International Data Transfers:** We use appropriate safeguards, such as Standard Contractual Clauses, for international data transfers.
- **Automated Decision-Making:** We may use automated decision-making in certain cases. You have the right to object to this.

This Privacy Policy is subject to change. Please check back regularly for updates.
`,
  },
  cookie: {
    title: 'Cookie Policy',
    content: `# Cookie Policy

_Last Updated:_ March 2, 2025

## Introduction

As a healthcare platform, we take cookie privacy and transparency seriously. This Cookie Policy explains how we use cookies and similar tracking technologies on our website and platform. It also explains how we manage cookie consent to ensure your privacy.

## What Are Cookies?

Cookies are small text files that are stored on your device when you visit a website. They serve various purposes, including:

- Remembering your preferences and settings
- Understanding how you interact with websites
- Helping with security and login verification
- Enabling certain website functionalities

## Cookies We Use

### Essential Cookies

These cookies are necessary for our website to function properly:

- Authentication cookies to manage user sessions
- Security cookies to prevent fraud and protect our service
- Technical cookies required for our platform's core functionality

### Functional Cookies

These cookies enable enhanced functionality:

- Language preferences
- Theme preferences (light/dark mode)
- User interface customization settings

### Analytics Cookies

We use minimal analytics to improve our service:

- Anonymous usage statistics
- Performance monitoring
- Error tracking for service improvement

## Cookie Duration

### Session Cookies

Temporary cookies that expire when you close your browser.

### Persistent Cookies

Cookies that remain on your device for a set period. We limit persistent cookies to a maximum of 12 months, as recommended by privacy regulations.

## Our Cookie Consent Solution

We use CookieKit to ensure transparency and control over cookies:

- Obtain explicit consent before setting non-essential cookies
- Provide granular control over cookie preferences
- Enable easy withdrawal of consent
- Maintain detailed consent records
- Update consent preferences in real-time

## Managing Cookie Preferences

You can manage your cookie preferences in several ways:

- Using our cookie consent banner
- Through your browser settings
- Via our preference center (accessible through the floating cookie button)

**Note:** Blocking essential cookies may affect the functionality of our website and platform.

## Third-Party Cookies

We minimize the use of third-party cookies. When required, we ensure our partners comply with relevant data protection regulations and maintain transparent privacy practices. Our third-party services include:

- Clerk for user authentication
- Stripe for payment processing
- PostHog for minimal usage statistics and analytics
- Beehiiv for newsletter subscription management

## Updates to This Policy

We may update this Cookie Policy to reflect changes in our practices or for legal compliance. We will notify you of any material changes and update the "Last updated" date accordingly.

## Contact Us

If you have questions about our Cookie Policy or our practices, please contact us at: [support@eleva.care](mailto:support@eleva.care) or call +351 931897950.
`,
  },
  dpa: {
    title: 'Data Processing Agreement',
    content: `# Data Processing Agreement (DPA) between Búzios e Tartarugas, Lda. (Eleva.care) and Data Processors

_Last Updated:_ January 27, 2025

## Parties:

**Data Controller:** 
- Búzios e Tartarugas, Lda. (Eleva.care), Rua Gil Vicente, 2 - 2775-198 Parede (Portugal), VAT Number: PT515001708

**Data Processors:**
- Neon Inc., 2261 Market Street STE 22601 San Francisco, CA, 94114, USA
- Clerk, Inc., 660 King Street Unit 345 San Francisco, CA 94107 United States
- Stripe, Inc., 510 Townsend St., San Francisco, CA United States
- PostHog Inc., 2261 Market St STE 22301, San Francisco, CA 94114, United States
- Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043 United States (for Single Sign-On services only)
- Beehiiv Inc., for processing newsletter data as defined in their applicable agreements.

## 1. Subject Matter and Purpose of Processing

This DPA governs the processing of personal data by the Data Processors on behalf of the Data Controller in connection with the provision of the following services:
- **Neon:** Database services for storing appointment data, synchronized with Clerk.
- **Clerk:** User management services.
- **Stripe:** Payment processing and storage of payment method data.
- **PostHog:** Analytics and user behavior tracking services.
- **Google Cloud:** Single Sign-On (SSO) services only.
- **Beehiiv:** Newsletter services and related communications.

The purpose of processing is to facilitate the operation of Eleva.care's platform and services, including user authentication, appointment management, payment processing, and analytics.

## 2. Definitions

For the purposes of this DPA, the following terms shall have the meanings set out below:

- **"Data Protection Laws"** means all applicable laws relating to the processing of Personal Data, including the General Data Protection Regulation (EU) 2016/679 ("GDPR"), UK GDPR, and other applicable data protection laws.
- **"Personal Data"** means any information relating to an identified or identifiable natural person as defined in Article 4(1) of the GDPR.
- **"Processing"** means any operation performed on Personal Data as defined in Article 4(2) of the GDPR.
- **"Data Subject"** means the identified or identifiable person to whom the Personal Data relates.
- **"Personal Data Breach"** means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, Personal Data.

## 3. Data Controller's Responsibilities

Eleva.care, as the Data Controller, shall:
- Comply with all applicable data protection laws, including GDPR.
- Provide clear and accurate instructions to the Data Processors regarding the processing of personal data.
- Obtain and maintain all necessary consents from data subjects for the processing of their personal data.
- Implement appropriate technical and organizational measures to ensure the security of personal data.
- Respond to requests from Data Subjects regarding their Personal Data rights.

## 4. Data Processors' Responsibilities

Each Data Processor shall:
- Process Personal Data only on documented instructions from Eleva.care.
- Ensure that persons authorized to process the Personal Data have committed themselves to confidentiality.
- Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk.
- Not engage another processor without prior authorization from Eleva.care.
- Assist Eleva.care in responding to requests from Data Subjects.
- Assist Eleva.care in ensuring compliance with security obligations.
- Delete or return all Personal Data to Eleva.care after the end of the provision of services.
- Make available to Eleva.care all information necessary to demonstrate compliance with this DPA.
- Not transfer Personal Data outside the EEA without adequate safeguards in place.

## 5. Personal Data Breach

In the event of a Personal Data Breach, the relevant Data Processor shall:
- Notify Eleva.care without undue delay upon becoming aware of a Personal Data Breach.
- Provide sufficient information to allow Eleva.care to meet any obligations to report to supervisory authorities or inform Data Subjects.
- Cooperate with Eleva.care and take reasonable steps to assist in the investigation, mitigation, and remediation of each breach.

## 6. Data Subject Rights

The Data Processors shall assist Eleva.care in responding to requests from Data Subjects exercising their rights under Data Protection Laws, including:
- Right of access
- Right to rectification
- Right to erasure
- Right to restriction of processing
- Right to data portability
- Right to object
- Rights related to automated decision making and profiling

## 7. International Transfers

Where a Data Processor transfers Personal Data outside the European Economic Area, it shall ensure that appropriate safeguards are in place, such as:
- Adequacy decisions
- Standard Contractual Clauses
- Binding Corporate Rules
- Certifications (such as EU-US Data Privacy Framework)

## 8. Termination

Upon termination of services, each Data Processor shall, at the choice of Eleva.care, delete or return all Personal Data and delete existing copies unless storage is required by applicable law.

## 9. Liability

Each Data Processor shall be liable for the damage caused by processing that infringes the Data Protection Laws. A Data Processor shall be exempt from liability if it proves that it is not in any way responsible for the event giving rise to the damage.

## 10. Audit Rights

Upon request, each Data Processor shall make available to Eleva.care all information necessary to demonstrate compliance with this DPA and shall allow for and contribute to audits, including inspections, conducted by Eleva.care or another auditor mandated by Eleva.care.

## 11. Subprocessing

Data Processors may engage subprocessors only with prior written authorization from Eleva.care. Any subprocessor must provide sufficient guarantees to implement appropriate technical and organizational measures.

## Contact Information

For questions regarding this Data Processing Agreement, please contact:
- **Email:** [support@eleva.care](mailto:support@eleva.care)
- **Phone:** +351 931897950
`,
  },
};

export default async function LegalPage(props: {
  params: Promise<{ document: keyof typeof legalDocs }>;
}) {
  const params = await props.params;

  const { document } = params;

  const doc = legalDocs[document];

  if (!doc) {
    return notFound();
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <CardContent className="p-6 sm:p-10">
        <ReactMarkdown className="prose prose-slate max-w-none">{doc.content}</ReactMarkdown>
      </CardContent>
    </Card>
  );
}
