import { Card, CardContent } from '@/components/atoms/card';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

const legalDocs = {
  terms: {
    title: 'Terms of Service',
    content: `# Terms of Service

_Last Updated:_ March 2, 2025

## 1. Introduction

Welcome to Eleva.care! These Terms of Service ("Terms") govern your access to and use of our website, platform, and services (collectively, the "Services"). By accessing or using the Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not access or use the Services.

## 2. Eligibility and Healthcare Context

The Services are intended for use by businesses and individuals in the healthcare industry. As a platform focused on healthcare services, we implement enhanced security measures to protect sensitive information. By using the Services, you represent and warrant that:

- You are authorized to enter into these Terms on behalf of yourself or the entity you represent
- You will comply with all applicable healthcare laws and regulations in your jurisdiction
- You will maintain appropriate licenses, certifications, and credentials required for providing healthcare services
- You will obtain appropriate consent from patients or clients before using our platform for their care

## 3. Account Creation and Security

To access certain features of the Services, you may be required to create an account. You are responsible for:

- Maintaining the confidentiality of your account credentials
- All activities that occur under your account
- Implementing reasonable security measures when accessing the Services
- Selecting strong passwords and updating them regularly
- Immediately notifying us of any unauthorized access or breach of security

## 4. Use of Services

You agree to use the Services only for lawful purposes and in compliance with these Terms and all applicable laws and regulations, including healthcare regulations. You shall not:

- Use the Services to transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or objectionable
- Upload or share protected health information except as explicitly permitted and securely managed by our platform
- Attempt to bypass or compromise any security mechanisms of the Services
- Introduce any viruses, malware, or harmful code to the Services
- Use automated systems or software to extract data from the Services

## 5. Healthcare Data Responsibility

If you are a healthcare provider or organization using our Services:

- You remain the data controller for any patient or client data you process using our Services
- You are responsible for obtaining appropriate consent from patients or clients before using our platform
- You must comply with applicable healthcare privacy laws in your jurisdiction
- You acknowledge that while we implement robust security measures, we are not currently HIPAA-certified
- You will configure security settings appropriately for your specific healthcare requirements

## 6. Payments

If you purchase any paid Services, you agree to pay the applicable fees as described on our website. All fees are non-refundable unless otherwise stated in writing. Payments are processed through Stripe, and their [Payment Method Terms](https://stripe.com/en-pt/legal/payment-method-terms) apply.

## 7. Intellectual Property

The Services and all content and materials included therein, including but not limited to text, graphics, logos, images, and software, are the property of Eleva.care or its licensors and are protected by copyright and other intellectual property laws. You may not:

- Copy, modify, or create derivative works based on the Services
- Reverse engineer, decompile, or disassemble any aspect of the Services
- Remove any copyright or other proprietary notices from the Services
- Use the Services' content for commercial purposes without explicit permission

Data entered by you remains your property, subject to our right to use it as described in these Terms and our Privacy Policy.

## 8. Privacy and Data Protection

Your use of the Services is subject to our [Privacy Policy](https://eleva.care/legal/privacy). By using the Services, you consent to the collection, use, and disclosure of your personal data as described in our Privacy Policy. Our processing of your data is governed by our [Data Processing Agreement](https://eleva.care/legal/dpa).

We use the following trusted providers for various aspects of our service:
- Clerk for user management: [Privacy Policy](https://clerk.com/legal/privacy) and [Data Processing Addendum](https://clerk.com/legal/dpa)
- Google OAuth 2.0 for authentication: [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- Beehiiv for our newsletter: [Privacy Policy](https://beehiiv.com/privacy), [Publisher Agreement](https://beehiiv.com/pa), and [Acceptable Use Policy](https://beehiiv.com/aup)
- PostHog for analytics: [Privacy Policy](https://posthog.com/privacy) and [Data Processing Agreement](https://posthog.com/dpa)
- Neon for database services: [Terms of Service](https://neon.tech/terms-of-service)
- Vercel for hosting: [Terms of Service](https://vercel.com/legal/terms) and [Data Processing Agreement](https://vercel.com/legal/dpa)
- Stripe for payments: [Services Agreement](https://stripe.com/legal/ssa) and [Connected Account Agreement](https://stripe.com/legal/connect-account)

## 9. Data Security and Encryption

We implement robust security measures to protect your data:

- We use AES-256-GCM encryption for sensitive stored data
- All data transmission is protected using TLS/SSL encryption
- Meeting records and clinical information are encrypted at rest
- We maintain a separate audit log database to track all data access
- Role-based access controls restrict data access to authorized users only

While we strive to maintain the highest security standards, no system can guarantee absolute security. You should take appropriate precautions when using the Services.

## 10. Third-Party Services

The Services may integrate with third-party services. Your use of these third-party services is subject to their respective terms and policies. We are not responsible for the practices of these third-party services. We select our third-party providers carefully, focusing on those with strong security practices and compliance certifications.

## 11. Disclaimer of Warranties

THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

We do not warrant that the Services will be uninterrupted, secure, or error-free, or that any defects will be corrected. We do not make any warranties about the accuracy, reliability, completeness, or timeliness of the Services.

## 12. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, ELEVA.CARE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (I) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES; (II) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES; OR (III) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.

Our total liability for any claims under these Terms shall not exceed the amount paid by you to us over the past 12 months.

## 13. Indemnification

You agree to indemnify and hold harmless Eleva.care and its affiliates, officers, directors, employees, and agents from any and all claims, liabilities, damages, losses, or expenses, including attorneys' fees and costs, arising out of or in any way connected with your access to or use of the Services, your violation of these Terms, or your infringement of any third-party rights.

## 14. Term and Termination

These Terms shall remain in full force and effect while you use the Services. We may terminate your access to the Services at any time for any reason, including your breach of these Terms. Upon termination:

- Your right to access and use the Services will immediately cease
- We may delete or preserve your account information and content at our discretion
- All provisions of these Terms which by their nature should survive termination shall survive

## 15. Governing Law

These Terms shall be governed by and construed in accordance with the laws of Portugal, without regard to its conflict of laws principles. Any disputes arising under these Terms shall be resolved exclusively in the courts of Portugal.

## 16. Changes to these Terms

We may revise these Terms at any time by posting an updated version on our website. Your continued use of the Services following any changes to these Terms constitutes your acceptance of the revised Terms. We will notify you of material changes through the Services or by email.

## 17. Contact Us

If you have any questions about these Terms, please contact us at [support@eleva.care](mailto:support@eleva.care) or [+351 931897950](tel:+351931897950).

## 18. Technology Stack and Security Architecture

Eleva is built using modern technologies including Next.js 14 with the App Router, React for building dynamic user interfaces, and Tailwind CSS with shadcn/ui for responsive design. We use Clerk for secure authentication, PostgreSQL with Drizzle ORM for efficient database management, and Stripe Connect for secure payment processing. Our platform also integrates Google Calendar for scheduling and Beehiiv for newsletter services.

Our security architecture includes:
- Separate database for audit logging
- Encryption of sensitive clinical data
- Role-based access controls
- Regular security reviews and updates
- Secure key management practices
- Strong authentication requirements
`,
  },
  privacy: {
    title: 'Privacy Policy',
    content: `# Privacy Policy for Eleva.care

_Last Updated:_ March 2, 2025

## 1. Introduction

Búzios e Tartarugas, Lda. ("Eleva.care," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our website and services. For the provision of our Services, Eleva leverages a modern technology stack including Next.js 14, Clerk for authentication, PostgreSQL with Drizzle ORM for database management, and Tailwind CSS with shadcn/ui for interface design.

## 2. Information We Collect

- **Information You Provide Directly:** When you register for an account, schedule a meeting, or contact us, we collect your name, email, phone number, health information, and IP address.
- **Information We Collect Automatically:** We use cookies and tracking technologies to collect data about your usage of our website and services, including your IP address and device information.
- **Information We Collect from Third Parties:** We may receive information about you from our partners or service providers.

## 3. Healthcare-Related Information

As a platform serving the healthcare industry, we understand the sensitivity of health-related information:

- **Clinical Information:** When healthcare professionals use our platform to record notes, diagnoses, recommendations, or other clinical information, this data is encrypted using AES-256-GCM encryption both in transit and at rest.
- **Meeting Records:** Information recorded during meetings is stored in our encrypted Records database, with separate encryption for content and metadata.
- **Audit Logging:** We maintain a separate audit log database that tracks all database interactions, including who accessed what records and when, to ensure accountability and transparency.

Although we are not currently HIPAA-certified, we implement many industry best practices for healthcare data protection and are working with our providers toward achieving higher compliance standards.

## 4. How We Use Your Information

We use your information to:
- Provide and improve our services.
- Communicate with you.
- Personalize your experience.
- Comply with legal obligations.
- Facilitate secure healthcare-related communications between experts and clients.
- Maintain and enhance the security and functionality of our platform.

## 5. How We Share Your Information

We may share your information with:
- Service providers who assist us in providing our services (listed in our Data Processing Agreement).
- Partners with whom we offer joint services.
- Legal authorities as required by law.

We do not sell, rent, or trade your personal information to third parties for marketing purposes.

## 6. Data Security

We implement robust security measures to protect your information, including:

- **End-to-End Encryption:** We use industry-standard TLS (Transport Layer Security) to encrypt data in transit.
- **At-Rest Encryption:** Sensitive data stored in our databases is encrypted using AES-256-GCM encryption.
- **Secure Key Management:** Encryption keys are stored securely and managed according to industry best practices.
- **Role-Based Access Control:** Our system enforces strict access controls based on user roles.
- **Audit Logging:** We maintain comprehensive logs of all system access and changes to sensitive data.
- **Regular Security Reviews:** We conduct regular reviews of our security practices and system configurations.

While no data transmission over the internet or electronic storage system can guarantee 100% security, we are committed to protecting your information using commercially reasonable measures.

## 7. Data Retention

We retain your information only as long as necessary to fulfill the purposes for which it was collected, to comply with legal obligations, or to resolve disputes. Specific retention periods may vary based on the type of information and applicable legal requirements.

## 8. Your Rights

Under applicable data protection laws, you have the right to:
- Access your personal information
- Rectify inaccurate or incomplete information
- Erase your personal information in certain circumstances
- Restrict or object to the processing of your personal information
- Data portability (receive your data in a structured, commonly used format)
- Withdraw consent at any time (where processing is based on consent)

To exercise these rights, please contact us using the details provided in the "Contact Us" section.

## 9. International Data Transfers

Your information may be transferred to and processed in countries outside the European Economic Area (EEA), including the United States. When transferring personal data outside the EEA, we implement appropriate safeguards such as:
- Standard Contractual Clauses approved by the European Commission
- EU-US Data Privacy Framework certifications (where applicable)
- Data Processing Agreements with our service providers

## 10. Third-Party Services

Our services integrate with trusted third-party services including Neon.tech, Clerk.com, Stripe, Vercel, PostHog, Google Cloud, and Beehiiv.com. We carefully select providers that maintain high security and privacy standards. Their respective privacy policies apply to their processing of your data.

## 11. Automated Decision-Making and Analytics

We use analytics tools like PostHog to improve our services by analyzing usage patterns anonymously. Where we employ automated decision-making or profiling, we implement suitable safeguards to protect your rights and freedoms. You have the right to request human intervention, express your point of view, and contest any automated decisions.

## 12. Contact Us

If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
- Email: [support@eleva.care](mailto:support@eleva.care)
- Phone: +351 931897950
- Postal Address: Rua Gil Vicente, 2 - 2775-198 Parede, Portugal

## Additional Clauses (GDPR Specific):

- **Lawful Basis for Processing:** We process your data based on your consent, contract fulfillment, legal obligations, and legitimate interests.
- **Data Protection Officer:** While not legally required to appoint a DPO, we have designated a privacy team responsible for overseeing our data protection strategy.
- **Supervisory Authority:** You have the right to lodge a complaint with a supervisory authority if you believe your data protection rights have been violated.

This Privacy Policy is subject to change. We will notify you of any material changes by posting the new policy on our website with an updated effective date.
`,
  },
  cookie: {
    title: 'Cookie Policy',
    content: `# Cookie Policy

_Last Updated:_ March 2, 2025

## Introduction

As a healthcare platform, we take cookie privacy and transparency very seriously. This Cookie Policy explains how we use cookies and similar tracking technologies on our website and platform, with special attention to healthcare data protection. It also explains how we manage cookie consent to ensure your privacy and compliance with relevant regulations.

## What Are Cookies?

Cookies are small text files that are stored on your device when you visit a website. They serve various purposes, including:

- Remembering your preferences and settings
- Understanding how you interact with websites
- Helping with security and login verification
- Enabling certain website functionalities
- Supporting secure authentication processes

## Healthcare Data and Cookies

We understand the sensitive nature of healthcare-related information:

- No clinical data or patient information is ever stored in cookies
- We do not use cookies to track health-related behaviors or conditions
- Our use of cookies is separate from our encrypted storage of healthcare information
- Cookie data is never combined with clinical information stored in our systems

## Types of Cookies We Use

### Essential Cookies

These cookies are necessary for our website to function properly and cannot be disabled:

- Authentication cookies to manage user sessions and secure login status
- Security cookies to prevent fraud and protect our service
- Technical cookies required for our platform's core functionality
- Load balancing cookies for optimal performance

### Functional Cookies

These cookies enable enhanced functionality but are not strictly necessary:

- Language preferences
- Theme preferences (light/dark mode)
- User interface customization settings
- Saved preferences for forms and features

### Analytics Cookies

We use minimal analytics through PostHog to improve our service:

- Anonymous usage statistics with data minimization principles applied
- Performance monitoring of site functionality
- Error tracking for service improvement
- User flow analysis to optimize platform experience

All analytics data is anonymized and aggregated. Individual users cannot be personally identified through our analytics implementation.

## Cookie Duration

### Session Cookies

Temporary cookies that expire when you close your browser. These are primarily used for essential functions like maintaining login sessions.

### Persistent Cookies

Cookies that remain on your device for a set period. We limit persistent cookies to a maximum of 12 months, as recommended by privacy regulations, with most expiring much sooner.

## Our Cookie Consent Solution

We use CookieKit to ensure transparency and control over cookies:

- Obtain explicit consent before setting non-essential cookies
- Provide granular control over cookie preferences by category
- Enable easy withdrawal of consent at any time
- Maintain detailed consent records for compliance purposes
- Update consent preferences in real-time across our platform

## Healthcare Industry Best Practices

As a platform serving the healthcare industry, we follow these additional best practices:

- We implement a "privacy by default" approach, minimizing cookie usage
- We regularly audit our cookie usage to ensure compliance with healthcare privacy standards
- We separate analytics data from any healthcare-related information
- We ensure all third-party cookie providers comply with relevant data protection regulations

## Managing Cookie Preferences

You can manage your cookie preferences in several ways:

- Using our cookie consent banner upon first visit
- Through your browser settings (instructions for common browsers provided below)
- Via our preference center (accessible through the "Cookie Preferences" button in the footer)
- By contacting our support team

**Browser Settings:**
- **Chrome**: Settings > Privacy and Security > Cookies and other site data
- **Firefox**: Options > Privacy & Security > Cookies and Site Data
- **Safari**: Preferences > Privacy > Cookies and website data
- **Edge**: Settings > Cookies and site permissions > Cookies

**Note:** Blocking essential cookies may affect the functionality of our website and platform, including security features.

## Third-Party Cookies

We minimize the use of third-party cookies. When required, we ensure our partners comply with relevant data protection regulations and maintain transparent privacy practices. Our third-party services include:

- Clerk for user authentication
- Stripe for payment processing
- PostHog for minimal usage statistics and analytics
- Beehiiv for newsletter subscription management

Each of these providers has been selected based on their security practices and compliance with data protection standards relevant to healthcare applications.

## Data Processing and Storage

Cookie data may be processed and stored in the European Union and in the United States. For transfers outside the EU, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses or adequacy decisions.

## Regular Cookie Audits

We conduct regular audits of our cookie usage to:
- Identify and remove unnecessary cookies
- Verify compliance with data protection regulations
- Ensure accuracy of cookie descriptions in this policy
- Minimize data collection to only what is necessary

## Updates to This Policy

We may update this Cookie Policy to reflect changes in our practices or for legal compliance. We will notify you of any material changes and update the "Last updated" date accordingly. Significant changes may also be announced via a banner on our website.

## Contact Us

If you have questions about our Cookie Policy or our practices, please contact us at:
- Email: [support@eleva.care](mailto:support@eleva.care)
- Phone: +351 931897950
- Postal Address: Rua Gil Vicente, 2 - 2775-198 Parede, Portugal
`,
  },
  dpa: {
    title: 'Data Processing Agreement',
    content: `# Data Processing Agreement (DPA) between Búzios e Tartarugas, Lda. (Eleva.care) and Data Processors

_Last Updated:_ March 2, 2025

## 1. Parties

**Data Controller:** 
- Búzios e Tartarugas, Lda. (Eleva.care), Rua Gil Vicente, 2 - 2775-198 Parede (Portugal), VAT Number: PT515001708

**Data Processors:**
- Neon Inc., 2261 Market Street STE 22601 San Francisco, CA, 94114, USA
- Clerk, Inc., 660 King Street Unit 345 San Francisco, CA 94107 United States
- Stripe, Inc., 510 Townsend St., San Francisco, CA United States
- PostHog Inc., 2261 Market St STE 22301, San Francisco, CA 94114, United States
- Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043 United States (for Single Sign-On services only)
- Beehiiv Inc., for processing newsletter data as defined in their applicable agreements.
- Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, United States

## 2. Definitions

For the purposes of this DPA, the following terms shall have the meanings set out below:

- **"Data Protection Laws"** means all applicable laws relating to the processing of Personal Data, including the General Data Protection Regulation (EU) 2016/679 ("GDPR"), UK GDPR, and other applicable data protection laws.
- **"Personal Data"** means any information relating to an identified or identifiable natural person as defined in Article 4(1) of the GDPR.
- **"Special Categories of Personal Data"** means personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, data concerning health, sex life, or sexual orientation.
- **"Processing"** means any operation performed on Personal Data as defined in Article 4(2) of the GDPR.
- **"Data Subject"** means the identified or identifiable person to whom the Personal Data relates.
- **"Personal Data Breach"** means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, Personal Data.
- **"Subprocessor"** means any processor engaged by a Data Processor to process Personal Data on behalf of the Data Controller.
- **"Healthcare Data"** means any data related to the physical or mental health of an individual, including the provision of healthcare services, which reveals information about their health status.

## 3. Subject Matter and Purpose of Processing

This DPA governs the processing of personal data by the Data Processors on behalf of the Data Controller in connection with the provision of the following services:

- **Neon:** Database services for storing appointment data, synchronized with Clerk.
- **Clerk:** User management services.
- **Stripe:** Payment processing and storage of payment method data.
- **PostHog:** Analytics and user behavior tracking services.
- **Google Cloud:** Single Sign-On (SSO) services only.
- **Beehiiv:** Newsletter services and related communications.
- **Vercel:** Hosting and edge computing services.

The purpose of processing is to facilitate the operation of Eleva.care's platform and services, including user authentication, appointment management, payment processing, and analytics in the context of a healthcare service platform.

## 4. Types of Personal Data and Categories of Data Subjects

### Types of Personal Data processed:

- **Identity Data:** Names, email addresses, phone numbers, user IDs
- **Profile Data:** Professional information, credentials, specialties, profile pictures
- **Account Data:** Username, password (hashed), account preferences
- **Communication Data:** Messages, emails, communication preferences
- **Technical Data:** IP addresses, cookies, device information, access logs
- **Usage Data:** Platform interaction, feature usage, analytics data
- **Payment Data:** Payment method details, transaction records, billing addresses
- **Healthcare-Related Data:** Appointment types, scheduling information, clinical notes (encrypted)

### Categories of Data Subjects:

- Healthcare professionals using the platform
- Clients/patients seeking healthcare services 
- Eleva.care staff and administrators
- Business partners and service providers

## 5. Data Controller's Responsibilities

Eleva.care, as the Data Controller, shall:

- Comply with all applicable data protection laws, including GDPR.
- Provide clear and accurate instructions to the Data Processors regarding the processing of personal data.
- Obtain and maintain all necessary consents from data subjects for the processing of their personal data.
- Implement appropriate technical and organizational measures to ensure the security of personal data.
- Respond to requests from Data Subjects regarding their Personal Data rights.
- Conduct data protection impact assessments where required by law.
- Maintain records of processing activities under its responsibility.
- Select Data Processors that provide sufficient guarantees to implement appropriate technical and organizational measures.

## 6. Data Processors' Responsibilities

Each Data Processor shall:

- Process Personal Data only on documented instructions from Eleva.care.
- Ensure that persons authorized to process the Personal Data have committed themselves to confidentiality.
- Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including:
  - Encryption of Personal Data where appropriate
  - Ensuring the ongoing confidentiality, integrity, availability, and resilience of processing systems
  - Ability to restore availability and access to Personal Data in a timely manner
  - Process for regularly testing, assessing, and evaluating the effectiveness of security measures
- Not engage another processor without prior specific or general written authorization from Eleva.care.
- Assist Eleva.care in responding to requests from Data Subjects.
- Assist Eleva.care in ensuring compliance with security obligations, including data breach notification.
- Delete or return all Personal Data to Eleva.care after the end of the provision of services.
- Make available to Eleva.care all information necessary to demonstrate compliance with this DPA.
- Not transfer Personal Data outside the EEA without adequate safeguards in place.
- Maintain records of all processing activities carried out on behalf of Eleva.care.

## 7. Security Measures

The Data Processors shall implement and maintain appropriate technical and organizational security measures, including:

### For All Data Processors:
- Access control systems with strong authentication
- Regular security testing and vulnerability assessments
- Encryption of data in transit using TLS/SSL
- Role-based access controls
- Employee training on data protection
- Incident response procedures
- Regular backup procedures

### Healthcare Data-Specific Measures:
- Encryption of sensitive healthcare data at rest using AES-256-GCM
- Special access controls for healthcare-related information
- Audit logging of all access to healthcare data
- Strict separation of healthcare data from other types of data
- Application of the principle of least privilege

## 8. Personal Data Breach

In the event of a Personal Data Breach, the relevant Data Processor shall:

- Notify Eleva.care without undue delay, and where feasible, within 24 hours upon becoming aware of a Personal Data Breach.
- Provide sufficient information to allow Eleva.care to meet any obligations to report to supervisory authorities or inform Data Subjects, including:
  - The nature of the breach
  - Categories and approximate number of Data Subjects affected
  - Categories and approximate number of records concerned
  - Likely consequences of the breach
  - Measures taken or proposed to address the breach
- Cooperate with Eleva.care and take reasonable steps to assist in the investigation, mitigation, and remediation of each breach.
- Document all breaches, including facts, effects, and remedial actions taken.

## 9. Data Subject Rights

The Data Processors shall assist Eleva.care in responding to requests from Data Subjects exercising their rights under Data Protection Laws, including:

- Right of access to personal data
- Right to rectification of inaccurate data
- Right to erasure ("right to be forgotten")
- Right to restriction of processing
- Right to data portability
- Right to object to processing
- Rights related to automated decision making and profiling

Each Data Processor shall promptly notify Eleva.care if it receives a request directly from a Data Subject and shall not respond to such request unless instructed to do so by Eleva.care.

## 10. Compliance with Healthcare Regulations

While Eleva.care and its Data Processors are not currently HIPAA-certified, the following provisions apply to healthcare data:

- Healthcare data is stored with enhanced security measures including encryption.
- Access to healthcare data is strictly controlled and monitored.
- Healthcare data is kept separate from other types of data where technically feasible.
- All Data Processors handling healthcare data implement industry best practices for health information security.
- Eleva.care and its Data Processors are working toward achieving higher compliance standards, including aspects of HIPAA compliance where appropriate.

## 11. International Transfers

Where a Data Processor transfers Personal Data outside the European Economic Area, it shall ensure that appropriate safeguards are in place, such as:

- Adequacy decisions issued by the European Commission
- Standard Contractual Clauses approved by the European Commission
- Binding Corporate Rules
- Certifications (such as EU-US Data Privacy Framework)

Each Data Processor shall document the specific mechanism used for international transfers and make this information available to Eleva.care upon request.

## 12. Audits and Inspections

Upon request, each Data Processor shall make available to Eleva.care all information necessary to demonstrate compliance with this DPA and shall allow for and contribute to audits, including inspections, conducted by Eleva.care or another auditor mandated by Eleva.care.

Such audits shall be subject to reasonable notice and conducted during regular business hours, with due consideration for the Data Processor's business operations. Eleva.care shall ensure that any auditor is bound by appropriate confidentiality obligations.

## 13. Termination

Upon termination of services, each Data Processor shall, at the choice of Eleva.care:

- Delete all Personal Data processed on behalf of Eleva.care
- Return all Personal Data to Eleva.care and delete existing copies
- Anonymize the data such that it can no longer be associated with any individual

Unless storage is required by applicable law, in which case the Data Processor shall inform Eleva.care of such legal requirement and ensure the ongoing confidentiality of the stored data.

## 14. Liability

Each Data Processor shall be liable for the damage caused by processing that infringes the Data Protection Laws or this DPA. A Data Processor shall be exempt from liability if it proves that it is not in any way responsible for the event giving rise to the damage.

Where multiple Data Processors are involved in the same processing and are responsible for damage caused by the processing, each shall be held liable for the entire damage to ensure effective compensation of the Data Subject.

## 15. Subprocessing

Data Processors may engage subprocessors only with prior written authorization from Eleva.care. When authorized to engage subprocessors, Data Processors shall:

- Enter into a written agreement with each subprocessor imposing the same data protection obligations as set out in this DPA
- Remain fully liable to Eleva.care for the performance of the subprocessor's obligations
- Provide Eleva.care with information about any intended changes concerning the addition or replacement of subprocessors, giving Eleva.care the opportunity to object to such changes

## 16. Amendments

Any amendment to this DPA must be in writing and signed by authorized representatives of both parties. However, Eleva.care may update the security measures and compliance requirements by notifying the Data Processors, provided such updates do not materially reduce the overall protection of Personal Data.

## 17. Severability

If any provision of this DPA is found by any court of competent jurisdiction to be invalid or unenforceable, the invalidity or unenforceability of such provision shall not affect the other provisions of this DPA, and all provisions not affected by such invalidity or unenforceability shall remain in full force and effect.

## Contact Information

For questions regarding this Data Processing Agreement, please contact:

- **Email:** [support@eleva.care](mailto:support@eleva.care)
- **Phone:** +351 931897950
- **Postal Address:** Rua Gil Vicente, 2 - 2775-198 Parede, Portugal
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
