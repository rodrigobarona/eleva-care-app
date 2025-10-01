# ⚖️ Legal & Compliance Documentation

**Complete Legal, Compliance, and Audit Documentation for Eleva.care**

> **Last Updated**: October 1, 2025  
> **Legal Entity**: Búzios e Tartarugas, Lda. (NIF: PT515001708)  
> **Jurisdiction**: Portugal (European Union)  
> **Primary Regulations**: GDPR Article 9, Portuguese Data Protection Law

---

## 📁 Documentation Structure

This directory contains all legal, compliance, and audit documentation organized into four main categories:

| Category                       | Purpose                                           | Priority    | Audience                        |
| ------------------------------ | ------------------------------------------------- | ----------- | ------------------------------- |
| **[compliance/](#compliance)** | GDPR, CNPD, DPO, data protection requirements     | 🔴 Critical | Legal, compliance teams, DPO    |
| **[audit/](#audit)**           | Technical & legal audits, security assessments    | 🟡 High     | Management, auditors, investors |
| **[platform/](#platform)**     | Platform model, liability protection, disclaimers | 🔴 Critical | Legal, product, marketing teams |
| **[guides/](#guides)**         | Translation guides, operational procedures        | 🟢 Medium   | All teams                       |

---

## 📋 Compliance Documentation

**Path**: `docs/06-legal/compliance/`

Core regulatory compliance documents for GDPR, Portuguese law, and health data regulations.

| #   | Document                                                                  | Purpose                                      | Status      |
| --- | ------------------------------------------------------------------------- | -------------------------------------------- | ----------- |
| 01  | [Legal Compliance Summary](./compliance/01-legal-compliance-summary.md)   | Complete compliance status overview          | ✅ Current  |
| 02  | [GDPR DPIA Template](./compliance/02-gdpr-dpia-template.md)               | Article 35 Data Protection Impact Assessment | ✅ Template |
| 03  | [DPO Designation Guide](./compliance/03-dpo-designation.md)               | How to appoint & register DPO with CNPD      | ✅ Guide    |
| 04  | [CNPD Compliance Guide](./compliance/04-cnpd-compliance-guide.md)         | Portuguese data authority requirements       | ✅ Current  |
| 05  | [Data Breach Procedures](./compliance/05-data-breach-procedures.md)       | 72-hour CNPD notification procedures         | ✅ Current  |
| 06  | [EU Health Data Compliance](./compliance/06-eu-health-data-compliance.md) | GDPR Article 9 health data requirements      | ✅ Current  |

### Key Compliance Requirements

**Immediate Actions** (Next 30-60 days):

- ✅ Execute Business Associate Agreements (BAAs) with vendors
- ✅ Complete Data Protection Impact Assessment (DPIA)
- ⚠️ Appoint and register Data Protection Officer (DPO) with CNPD
- ⚠️ Finalize data breach notification procedures
- ⚠️ Implement enhanced audit logging for health data

**Regulatory Framework**:

- Primary: **GDPR Article 9** (Special Categories - Health Data)
- National: **Lei n.º 58/2019** (Portuguese Data Protection Law)
- Authority: **CNPD** (Comissão Nacional de Proteção de Dados)
- Optional: **HIPAA** (if serving US patients/providers)

---

## 🔍 Audit Documentation

**Path**: `docs/06-legal/audit/`

Comprehensive technical and legal audits, security assessments, and compliance reviews.

| #   | Document                                                           | Purpose                                    | Date     | Grade         |
| --- | ------------------------------------------------------------------ | ------------------------------------------ | -------- | ------------- |
| 01  | [Legal Audit Deliverables](./audit/01-legal-audit-deliverables.md) | Complete legal audit package & findings    | Oct 2025 | 85% Compliant |
| 02  | [Technical Audit 2025](./audit/02-technical-audit-2025.md)         | Full technical security & compliance audit | Oct 2025 | B+ (Good)     |
| 03  | [Audit Quick Reference](./audit/03-audit-quick-reference.md)       | Quick reference guide for audits           | Oct 2025 | Reference     |

### Audit Summary

**Overall Grade**: **B+ (Good with Improvements Needed)**

**Security Architecture**: A- (Strong)

- ✅ AES-256-GCM encryption for health records
- ✅ Multi-layer RBAC with Clerk
- ✅ Redis-based distributed rate limiting
- ✅ Separate audit database for compliance

**Healthcare Compliance**: B (Needs Enhancement)

- ✅ HIPAA-ready infrastructure (Neon.tech Scale)
- ✅ Business Associate Agreement (BAA) executed
- ⚠️ DPO appointment pending
- ⚠️ DPIA completion pending

**Data Protection**: A (Excellent)

- ✅ EU data residency (Frankfurt, Germany)
- ✅ Encryption at rest and in transit
- ✅ Access controls and audit logging
- ✅ GDPR Article 9 compliance framework

---

## 🏥 Platform Documentation

**Path**: `docs/06-legal/platform/`

Critical documentation defining Eleva.care's role as a marketplace platform (NOT a healthcare provider).

| #   | Document                                                                         | Purpose                                           | Importance  |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------- | ----------- |
| 01  | [Platform vs. Provider Analysis](./platform/01-platform-vs-provider-analysis.md) | Critical distinction clarifying marketplace model | 🚨 Critical |
| 02  | [Platform Clarity Summary](./platform/02-platform-clarity-summary.md)            | Final summary of platform clarity implementation  | 🔴 High     |
| 03  | [Platform Clarity Updates](./platform/03-platform-clarity-updates.md)            | All content updates for legal protection          | 🔴 High     |
| 04  | [Immediate Actions Guide](./platform/04-immediate-actions.md)                    | 30-day action plan for platform model             | 🟡 Medium   |

### Platform Model Overview

**Eleva.care Business Model**:

- ✅ **Technology Marketplace Platform** (like Airbnb for healthcare)
- ❌ **NOT a Healthcare Provider** (no direct patient care)
- ❌ **NOT a Medical Practice or Clinic**

**Legal Structure**:

- **Platform Services**: Eleva.care is the Data Controller (scheduling, payments, platform operations)
- **Healthcare Services**: Independent practitioners are Data Controllers for clinical data
- **Eleva.care Role**: Data Processor for practitioners' clinical records

**Cost Savings**: €18,000-€33,000/year (vs. healthcare provider model)

**Liability Protection**: Platform disclaimers implemented across all pages

---

## 📚 Guides & Resources

**Path**: `docs/06-legal/guides/`

Operational guides, translation resources, and reference materials.

| #   | Document                                              | Purpose                                              | Audience               |
| --- | ----------------------------------------------------- | ---------------------------------------------------- | ---------------------- |
| 01  | [Translation Guide](./guides/01-translation-guide.md) | Complete legal terminology translations (PT, ES, BR) | All teams, translators |

### Translation Guide Coverage

**Languages**: Portuguese (PT), Spanish (ES), Brazilian Portuguese (BR)

**Categories Covered**:

- Legal entities and roles
- Data protection terminology
- Platform and marketplace terms
- Technical and security terms
- Healthcare and medical terms
- Financial and payment terms

---

## 🔗 Related Documentation

### Live Legal Pages

- **Privacy Policy**: https://eleva.care/legal/privacy ([source](../../content/privacy/))
- **Terms of Service**: https://eleva.care/legal/terms ([source](../../content/terms/))
- **Cookie Policy**: https://eleva.care/legal/cookie ([source](../../content/cookie/))
- **Data Processing Agreement**: https://eleva.care/legal/dpa ([source](../../content/dpa/))
- **Payment Policies**: https://eleva.care/legal/payment-policies ([source](../../content/payment-policies/))
- **Practitioner Agreement**: https://eleva.care/legal/practitioner-agreement ([source](../../content/practitioner-agreement/))

### Internal Documentation

- **Core Systems**: [docs/02-core-systems/](../02-core-systems/)
- **Infrastructure**: [docs/03-infrastructure/](../03-infrastructure/)
- **Development**: [docs/04-development/](../04-development/)

---

## 🚨 Critical Compliance Checklist

### Completed ✅

- [x] Privacy Policy (multi-language)
- [x] Terms of Service (multi-language)
- [x] Data Processing Agreement (DPA)
- [x] Cookie Consent implementation
- [x] Platform disclaimer on all pages
- [x] HIPAA-ready infrastructure (Neon.tech BAA)
- [x] Encryption (AES-256-GCM + TLS 1.3)
- [x] EU data residency (Frankfurt)

### In Progress ⚠️

- [ ] Data Protection Officer (DPO) appointment & CNPD registration
- [ ] Data Protection Impact Assessment (DPIA) completion
- [ ] Enhanced PHI audit logging
- [ ] Vendor BAA execution (all providers)
- [ ] Incident response plan finalization

### Pending 📋

- [ ] CNPD registration as data controller
- [ ] Annual GDPR compliance audit
- [ ] Security penetration testing
- [ ] Business continuity plan
- [ ] Disaster recovery documentation

---

## 📞 Key Contacts

### Regulatory Authorities

- **CNPD (Portuguese DPA)**: https://www.cnpd.pt / geral@cnpd.pt
- **European Data Protection Board**: https://edpb.europa.eu

### Service Providers (BAAs Required)

- **Neon.tech** (Database): ✅ BAA Executed - HIPAA Scale Plan
- **Clerk.com** (Auth): ✅ DPA Available
- **Stripe** (Payments): ✅ DPA Available
- **Vercel** (Hosting): ✅ DPA Available
- **PostHog** (Analytics): ✅ DPA Available
- **Novu** (Notifications): ✅ DPA Available
- **Resend** (Email): ✅ DPA Available

### Internal Contacts

- **Legal Lead**: [To be assigned]
- **Data Protection Officer (DPO)**: [To be appointed]
- **Security Lead**: [To be assigned]
- **Compliance Officer**: [To be assigned]

---

## 🔄 Document Maintenance

### Review Schedule

- **Compliance docs**: Quarterly review
- **Audit reports**: Annual + ad-hoc
- **Platform docs**: Review with each major platform change
- **Translation guide**: Update with new legal terms

### Version Control

- All legal documents are version-controlled in Git
- Changes require legal review before implementation
- User-facing changes must be announced 30 days in advance (GDPR requirement)

### Last Major Updates

- **October 2025**: Complete documentation reorganization
- **October 2025**: HIPAA infrastructure clarification
- **October 2025**: Platform model legal clarity implementation
- **October 2025**: Comprehensive legal audit completion

---

**📍 For Questions**: Contact legal@eleva.care or your designated compliance officer.
