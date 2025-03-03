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

Our company is headquartered in Portugal, European Union, and we are committed to complying with European data protection regulations, including the General Data Protection Regulation (GDPR).

## 2. Information We Collect

- **Information You Provide Directly:** When you register for an account, schedule a meeting, or contact us, we collect your name, email, phone number, health information, and IP address.
- **Information We Collect Automatically:** We use cookies and tracking technologies to collect data about your usage of our website and services, including your IP address and device information.
- **Information We Collect from Third Parties:** We may receive information about you from our partners or service providers.

## 3. Healthcare-Related Information

As a platform serving the healthcare industry, we understand the sensitivity of health-related information:

- **Clinical Information:** When healthcare professionals use our platform to record notes, diagnoses, recommendations, or other clinical information, this data is encrypted using AES-256-GCM encryption both in transit and at rest.
- **Meeting Records:** Information recorded during meetings is stored in our encrypted Records database, with separate encryption for content and metadata.
- **Audit Logging:** We maintain a separate audit log database that tracks all database interactions, including who accessed what records and when, to ensure accountability and transparency.

## 4. How We Use Your Information

We use your information to:
- Provide and improve our Services
- Communicate with you, including sending appointment reminders
- Process transactions and manage your account
- Personalize your experience and provide relevant content
- Maintain the security and integrity of our platform
- Respond to your inquiries and support requests

## 5. How We Share Your Information

We may share your information with:

- **Service Providers:** We may share your information with trusted third-party service providers who help us operate our Services. These providers are contractually obligated to use your information only for the services they provide to us.
- **Healthcare Providers:** With your consent, we may share your information with healthcare providers you connect with through our platform.
- **Legal Requirements:** We may disclose your information if required by law, regulation, or legal process.
- **Business Transfers:** If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.

## 6. Data Security Measures

We implement robust security measures to protect your information:

- **TLS/SSL Encryption:** All data transmitted between your device and our servers is encrypted using TLS/SSL technology.
- **At-Rest Encryption:** Sensitive data stored in our databases is encrypted using AES-256-GCM encryption.
- **Secure Key Management:** Encryption keys are stored securely and managed according to industry best practices.
- **Regular Security Audits:** We conduct regular security audits and penetration testing to identify and address vulnerabilities.
- **Role-Based Access Control:** Access to sensitive data is restricted to authorized personnel on a need-to-know basis.
- **Multi-Factor Authentication:** We implement multi-factor authentication for administrative access.
- **Backup and Recovery:** We maintain regular backups of our databases with strict access controls.

## 7. Data Processing Locations and Infrastructure

Búzios e Tartarugas, Lda. is based in Portugal (European Union) and we prioritize storing and processing your data within the European Union whenever possible:

- **Application Hosting:** Our application is hosted on Vercel with the primary region set to Frankfurt, Germany (eu-central-1) within the European Union.
- **Database Services:** We use Neon.tech for our PostgreSQL database, which is hosted in AWS Europe (Frankfurt) data centers.
- **Analytics:** We use PostHog for analytics, with data processing occurring within the European Union.
- **Other Service Providers:** For services where we use Clerk (authentication), Google (SSO), Beehiiv (newsletters), and Stripe (payments), data may be processed according to their respective privacy policies and data processing agreements.

We are committed to maintaining European data residency whenever feasible and implementing appropriate safeguards when data must be processed outside the EU.

## 8. Your Rights

Under applicable data protection laws, including the GDPR, you have certain rights regarding your personal information:

- **Right to Access:** You have the right to request a copy of the personal information we hold about you.
- **Right to Rectification:** You have the right to request that we correct any inaccurate or incomplete information about you.
- **Right to Erasure:** You have the right to request that we delete your personal information in certain circumstances.
- **Right to Restrict Processing:** You have the right to request that we restrict the processing of your personal information in certain circumstances.
- **Right to Data Portability:** You have the right to request that we transfer your personal information to another service provider in a structured, commonly used, and machine-readable format.
- **Right to Object:** You have the right to object to the processing of your personal information in certain circumstances.
- **Right to Withdraw Consent:** If we rely on your consent to process your personal information, you have the right to withdraw that consent at any time.

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

**Búzios e Tartarugas, Lda.**
Email: privacy@eleva.care
Address: [Portuguese company address]

## 13. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated Privacy Policy on our website and changing the "Last Updated" date at the top of this policy.

## 14. Supervisory Authority

If you are located in the European Union, you have the right to lodge a complaint with your local data protection authority if you believe that our processing of your personal information does not comply with the GDPR.`,
  },
  cookie: {
    title: 'Cookie Policy',
    content: `# Cookie Policy for Eleva.care

_Last Updated:_ March 2, 2025

## Introduction

This Cookie Policy explains how Búzios e Tartarugas, Lda. ("Eleva.care," "we," "us," or "our") uses cookies and similar technologies on our website and platform. It explains what these technologies are and why we use them, as well as your rights to control our use of them.

## What Are Cookies?

Cookies are small text files that are stored on your device when you visit a website. They serve various purposes, including:

- Ensuring the website functions properly
- Remembering your preferences and settings
- Analyzing how you use the website to improve it
- Personalizing your experience
- In some cases, delivering targeted advertisements

## Types of Cookies We Use

### Essential Cookies

Essential cookies are necessary for the proper functioning of our website and platform. They enable core features such as security, network management, and account access. You cannot opt out of these cookies as the website cannot function properly without them.

Examples include:
- Session cookies that maintain your authenticated state
- Security cookies that help protect our platform from abuse
- Load balancing cookies that distribute traffic to make our website more responsive

### Functional Cookies

Functional cookies enhance the functionality of our website by storing your preferences. These include:
- Language preference cookies
- Interface customization settings
- Form auto-fill data (excluding sensitive information)

### Analytics Cookies

We use analytics cookies to understand how visitors interact with our website, which helps us improve it:
- Anonymous usage statistics
- Time spent on different pages
- Navigation paths through the site
- Performance monitoring

### For healthcare professionals:
- No clinical data or patient information is ever stored in cookies
- Cookie consent is required before non-essential cookies are set
- Cookie data is never combined with clinical information stored in our systems
- All cookies comply with healthcare industry security standards

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

We conduct regular audits of the cookies used on our site to:
- Ensure our Cookie Policy remains accurate
- Remove any unnecessary cookies
- Verify compliance with data protection regulations
- Maintain minimal data collection practices
- Ensure third-party cookies remain compliant with our standards

## Managing Your Cookie Preferences

You can manage your cookie preferences by:

1. **Using Our Cookie Banner:** When you first visit our website, you'll see a cookie banner that allows you to accept or decline non-essential cookies.

2. **Adjusting Your Browser Settings:** Most web browsers allow you to manage your cookie preferences. You can set your browser to refuse cookies, delete cookies, or display a warning before a cookie is stored. Please note that if you disable or refuse cookies, some parts of our website may become inaccessible or not function properly.

Here's how to manage cookies in common browsers:
- **Chrome**: Settings > Privacy and security > Cookies and other site data
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

## Duration of Cookies

Different cookies remain active for different periods:
- **Session cookies:** These temporary cookies are deleted when you close your browser
- **Persistent cookies:** These remain on your device until they expire or you delete them manually
- **Essential security cookies:** May last up to 12 months to ensure continuous protection

Specific durations for each cookie are documented in our internal cookie inventory and are reviewed regularly to ensure they store data for the minimum time necessary.

## Changes to This Cookie Policy

We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will be posted on this page with an updated "Last Updated" date.

## Contact Us

If you have any questions about our use of cookies or this Cookie Policy, please contact us at:

**Búzios e Tartarugas, Lda.**
Email: privacy@eleva.care
Address: [Portuguese company address]

For more information about your privacy rights, please see our [Privacy Policy](https://eleva.care/legal/privacy).`,
  },
  dpa: {
    title: 'Data Processing Agreement',
    content: `# Data Processing Agreement

_Last Updated:_ March 2, 2025

This Data Processing Agreement ("DPA") is entered into between:

**Búzios e Tartarugas, Lda. ("Eleva.care")**, a company incorporated under the laws of Portugal, operating the Eleva.care platform; and

**The Customer** (as defined in the Terms of Service or other agreement between Eleva.care and the Customer).

## 1. Definitions

For the purposes of this DPA, the following terms shall have the meanings set out below:

- **"Data Protection Laws"** means all applicable laws relating to the processing of Personal Data, including the General Data Protection Regulation (EU) 2016/679 ("GDPR"), UK GDPR, and other applicable data protection laws.
- **"Personal Data"** means any information relating to an identified or identifiable natural person as defined in Article 4(1) of the GDPR.
- **"Special Categories of Personal Data"** means personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, data concerning health, sex life, or sexual orientation.
- **"Processing"** means any operation performed on Personal Data as defined in Article 4(2) of the GDPR.
- **"Data Subject"** means an identified or identifiable natural person to whom Personal Data relates.
- **"Data Controller"** means the entity that determines the purposes and means of the Processing of Personal Data.
- **"Data Processor"** means the entity that processes Personal Data on behalf of the Data Controller.
- **"Sub-processor"** means any Data Processor engaged by Eleva.care or its affiliates to assist in fulfilling its obligations with respect to providing the Services.
- **"Services"** means the services provided by Eleva.care to the Customer under the Terms of Service or other agreement.
- **"Security Incident"** means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, Personal Data transmitted, stored, or otherwise processed.

## 2. Subject Matter and Duration

### 2.1 Subject Matter
This DPA applies to the Processing of Personal Data by Eleva.care on behalf of the Customer in connection with the provision of the Services.

### 2.2 Duration
This DPA shall commence on the date the Customer begins using the Services and shall continue until the termination of the Services. Upon termination of the Services, Eleva.care shall delete or return all Personal Data processed on behalf of the Customer, unless applicable law requires storage of the Personal Data.

## 3. Nature and Purpose of Processing

### 3.1 Nature of Processing
Eleva.care will process Personal Data as necessary to provide the Services to the Customer pursuant to the Terms of Service or other agreement between Eleva.care and the Customer.

### 3.2 Purpose of Processing
The purpose of the Processing is to provide the Services to the Customer, which may include:
- Facilitating account creation and authentication
- Enabling the scheduling and management of appointments
- Providing video conferencing capabilities
- Enabling healthcare professionals to record and access clinical notes and recommendations
- Processing payments for services
- Providing customer support
- Maintaining the security and performance of the Services

## 4. Categories of Data Subjects and Personal Data

### 4.1 Categories of Data Subjects
The categories of Data Subjects whose Personal Data may be processed under this DPA include:
- The Customer and its employees, contractors, and representatives
- The Customer's clients or patients
- Other individuals whose Personal Data is processed by the Customer through the Services

### 4.2 Categories of Personal Data
The categories of Personal Data that may be processed under this DPA include:
- Basic personal information (name, email address, phone number)
- Account credentials and authentication data
- Payment information
- Scheduling and appointment data
- Communication content and metadata
- IP addresses and device information
- Healthcare-related information, which may include Special Categories of Personal Data

### 4.3 Special Categories of Personal Data
The Customer acknowledges that the Services are designed to process healthcare information, which may include Special Categories of Personal Data. Eleva.care has implemented enhanced security measures suitable for processing such data.

## 5. Rights and Obligations of the Data Controller

### 5.1 Instructions
Eleva.care shall process Personal Data only on documented instructions from the Customer, including with regard to transfers of Personal Data to a third country or an international organization, unless required to do so by applicable law.

### 5.2 Compliance with Data Protection Laws
The Customer, as Data Controller, shall:
- Ensure it has a lawful basis for processing Personal Data
- Comply with all applicable data protection laws, including GDPR.
- Provide appropriate privacy notices to Data Subjects
- Respond to Data Subject requests in accordance with applicable law
- Obtain valid consent from Data Subjects where required
- Implement appropriate technical and organizational measures to protect Personal Data

### 5.3 Security Risk Assessment
The Customer is responsible for conducting its own risk assessment to determine whether the security measures implemented by Eleva.care are appropriate for the Customer's intended use of the Services.

## 6. Obligations of the Data Processor

### 6.1 Compliance with Instructions
Eleva.care shall process Personal Data only on documented instructions from the Customer, unless required by applicable law.

### 6.2 Confidentiality
Eleva.care shall ensure that persons authorized to process the Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.

### 6.3 Security Measures
Eleva.care shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including:
- Encryption of Personal Data in transit and at rest
- Ability to ensure the ongoing confidentiality, integrity, availability, and resilience of processing systems and services
- Ability to restore availability and access to Personal Data in a timely manner
- Regular testing, assessing, and evaluating the effectiveness of security measures

### 6.4 Sub-processors
Eleva.care shall not engage any Sub-processor without prior authorization from the Customer. The Customer hereby provides general authorization for Eleva.care to engage Sub-processors listed in Eleva.care's Sub-processor List, which shall be made available to the Customer upon request. For any new Sub-processors, Eleva.care shall inform the Customer in advance, giving the Customer the opportunity to object.

### 6.5 Data Subject Rights
Eleva.care shall assist the Customer in responding to requests from Data Subjects exercising their rights under applicable Data Protection Laws, taking into account the nature of the processing.

### 6.6 Security Incidents
Eleva.care shall notify the Customer without undue delay after becoming aware of a Security Incident affecting the Customer's Personal Data. The notification shall include information required for the Customer to comply with its obligations under applicable Data Protection Laws.

### 6.7 Data Protection Impact Assessments
Eleva.care shall provide reasonable assistance to the Customer with any data protection impact assessments and prior consultations with supervisory authorities, taking into account the nature of processing and the information available to Eleva.care.

### 6.8 Deletion or Return of Personal Data
Upon termination of the Services, Eleva.care shall, at the choice of the Customer, delete or return all Personal Data to the Customer and delete existing copies, unless applicable law requires storage of the Personal Data.

### 6.9 Audit Rights
Eleva.care shall make available to the Customer all information necessary to demonstrate compliance with the obligations laid down in this DPA and allow for and contribute to audits, including inspections, conducted by the Customer or another auditor mandated by the Customer.

## 7. Sub-processors

### 7.1 Authorization
The Customer provides general authorization for Eleva.care to engage Sub-processors for the Processing of Personal Data, provided that Eleva.care:
- Maintains an up-to-date list of Sub-processors
- Informs the Customer of any intended changes concerning the addition or replacement of Sub-processors
- Imposes data protection terms on any Sub-processor that are substantially similar to those contained in this DPA

### 7.2 Objection to Sub-processors
The Customer may object to Eleva.care's use of a new Sub-processor by notifying Eleva.care promptly in writing within 10 business days after Eleva.care's notice. If the Customer objects to a new Sub-processor, Eleva.care will use reasonable efforts to make available to the Customer a change in the Services or recommend a commercially reasonable change to the Customer's configuration or use of the Services to avoid processing of Personal Data by the objected-to Sub-processor.

### 7.3 Liability
Eleva.care shall remain responsible for the acts and omissions of its Sub-processors to the same extent Eleva.care would be liable if performing the services of each Sub-processor directly under the terms of this DPA.

## 8. Additional Security Measures

### 8.1 Access Controls
Eleva.care implements strict access controls based on the principle of least privilege. Access to Personal Data is limited to authorized personnel who require such access to perform their job functions. All access is logged and regularly reviewed.

### 8.2 Encryption
Eleva.care implements encryption for Personal Data in transit and at rest:
- TLS 1.2 or higher for all data in transit
- AES-256 encryption for data at rest
- Secure key management practices

### 8.3 Regular Security Testing
Eleva.care conducts regular security testing, including:
- Vulnerability scanning
- Penetration testing
- Code reviews
- Security audits

### 8.4 Employee Training
Eleva.care ensures all employees receive regular training on data protection, privacy, and security.

### 8.5 Healthcare Data
- Healthcare data is stored with enhanced security measures including encryption.
- Access to healthcare data is strictly controlled and audited.
- Healthcare data is segregated from other types of data where appropriate.

## 9. Security Incidents

### 9.1 Notification
Eleva.care shall notify the Customer without undue delay, but in no case later than 48 hours, after becoming aware of a Security Incident affecting the Customer's Personal Data. Where possible, the notification shall include:
- A description of the nature of the Security Incident
- The name and contact details of Eleva.care's data protection officer or other contact point
- A description of the likely consequences of the Security Incident
- A description of the measures taken or proposed to be taken to address the Security Incident

### 9.2 Remediation
Eleva.care shall take prompt action to investigate and remediate any Security Incident and to mitigate any potential harm.

### 9.3 Documentation
Eleva.care shall maintain a record of all Security Incidents, including the facts relating to the Security Incident, its effects, and the remedial action taken.

## 10. Compliance and Certifications

Eleva.care maintains a comprehensive privacy and security program designed to comply with applicable data protection laws and industry standards. Eleva.care and its Data Processors are working toward achieving higher compliance standards, including aspects of HIPAA compliance where appropriate.

## 11. International Transfers

Where a Data Processor transfers Personal Data outside the European Economic Area, it shall ensure that appropriate safeguards are in place, such as:

- Adequacy decisions issued by the European Commission
- Standard Contractual Clauses approved by the European Commission
- Binding Corporate Rules
- Certifications (such as EU-US Data Privacy Framework)

Each Data Processor shall document the specific mechanism used for international transfers and make this information available to Eleva.care upon request.

## 12. Term and Termination

### 12.1 Term
This DPA shall remain in effect for the duration of the Customer's use of the Services.

### 12.2 Termination
Upon termination of the Services, this DPA shall automatically terminate. Upon termination, Eleva.care shall, at the choice of the Customer, delete or return all Personal Data to the Customer and delete existing copies, unless applicable law requires storage of the Personal Data.

Unless storage is required by applicable law, in which case the Data Processor shall inform Eleva.care of such legal requirement and ensure the ongoing confidentiality of the stored data.

## 13. Miscellaneous

### 13.1 Modifications
This DPA may only be modified by a written amendment signed by both parties.

### 13.2 Severability
If any provision of this DPA is found to be invalid or unenforceable, the remaining provisions shall remain in effect.

### 13.3 Conflicts
In the event of any conflict between this DPA and any other agreements between the parties, this DPA shall prevail with respect to the parties' data protection obligations.

### 13.4 Notices
All notices under this DPA shall be in writing and delivered to the parties at their respective addresses set forth in the Terms of Service or other agreement between the parties.

### 13.5 Governing Law
This DPA shall be governed by the laws of Portugal, without regard to choice of law principles.

## 14. Contact Information

For any questions or concerns regarding this DPA, please contact us at:

**Búzios e Tartarugas, Lda.**
Email: privacy@eleva.care
Address: [Portuguese company address]`,
  },
};

export default async function LegalPage(props: {
  params: Promise<{ document: keyof typeof legalDocs }>;
}) {
  const { document } = await props.params;

  if (!legalDocs[document]) {
    return notFound();
  }

  const { content } = legalDocs[document];

  return (
    <Card className="mb-20">
      <CardContent className="prose prose-lg max-w-none p-8">
        <ReactMarkdown>{content}</ReactMarkdown>
      </CardContent>
    </Card>
  );
}
