# 📚 Eleva Care Documentation Hub

> **Complete technical documentation for the Eleva Care platform - clean, organized, and current**

## 🧭 Documentation Structure

Our documentation follows a **hierarchical priority-based system** designed for maximum usability and maintainability.

### 📁 Folder Organization

| Folder                    | Purpose                                                              | Target Audience              | Priority    |
| ------------------------- | -------------------------------------------------------------------- | ---------------------------- | ----------- |
| **01-getting-started**    | Quick start guides, onboarding, essential setup, changelog           | New developers, stakeholders | 🔴 Critical |
| **02-core-systems**       | Main application systems (payments, auth, scheduling, notifications) | All developers               | 🔴 Critical |
| **03-infrastructure**     | DevOps, deployment, monitoring, CI/CD, caching                       | DevOps, senior developers    | 🟡 High     |
| **04-development**        | Development guides, testing, code standards, integrations            | All developers               | 🟡 High     |
| **05-guides**             | How-to guides, troubleshooting, best practices                       | All team members             | 🟢 Medium   |
| **06-legal**              | Legal documents, privacy policy, terms of service                    | Legal, compliance teams      | 🟡 High     |
| **07-project-management** | Issue tracking, project planning, stakeholder docs                   | Project managers, leads      | 🟢 Medium   |
| **08-deployment**         | Production deployments, migration guides                             | DevOps, senior developers    | 🟡 High     |
| **09-integrations**       | Third-party integrations, external tools                             | All developers               | 🟢 Medium   |
| **archived**              | Legacy, outdated, or completed implementation docs                   | Reference only               | ⚪ Low      |

---

## 🚀 Quick Start

### New Team Members

1. **Start here**: [Getting Started](./01-getting-started/README.md)
2. **Essential systems**: [Core Systems](./02-core-systems/README.md)
3. **Development setup**: [Development Guides](./04-development/README.md)
4. **Legal compliance**: [Legal & Compliance](./06-legal/README.md)

### Existing Developers

- **System overview**: [Core Systems](./02-core-systems/README.md)
- **Infrastructure**: [Infrastructure](./03-infrastructure/README.md)
- **Development guides**: [Development](./04-development/README.md)
- **External integrations**: [Integrations](./09-integrations/README.md)

### Operations & DevOps

- **Monitoring**: [BetterStack Monitoring](./03-infrastructure/monitoring/01-betterstack-monitoring.md)
- **Deployment**: [Deployment Guides](./08-deployment/README.md)
- **CI/CD**: [CI/CD Integration](./03-infrastructure/ci-cd/01-ci-cd-integration.md)

---

## 🗂️ Documentation Sections

### 01 - Getting Started

Quick start guides, API overview, architecture basics, and changelog.

📄 **Files:** 7 documents including README, CHANGELOG, and quick-start guide  
📖 **Start here**: [Getting Started README](./01-getting-started/README.md)

---

### 02 - Core Systems

Critical application systems including authentication, payments, caching, notifications, and scheduling.

#### Subsections:

- **Authentication** (4 files): Clerk configuration, roles, permissions, route protection
- **Caching** (4 files): Redis implementation, Clerk cache, Stripe cache, rate limiting
- **Notifications** (4 files): Novu integration, workflows, Stripe notifications
- **Payments** (10 files): Payment flow, Stripe integration, payouts, Multibanco, refund policies
- **Scheduling** (2 files): Scheduling engine, booking layout

📄 **Files:** ~25 documents  
📖 **Start here**: [Core Systems README](./02-core-systems/README.md)

---

### 03 - Infrastructure

DevOps, monitoring, CI/CD, automation, and infrastructure management.

#### Subsections:

- **Monitoring** (5 files): BetterStack, health checks, PostHog analytics
- **Scheduling** (2 files): Cron jobs, QStash integration
- **CI/CD** (1 file): GitHub Actions and Vercel integration
- **Automation** (1 file): Automation systems overview

📄 **Files:** ~10 documents  
📖 **Start here**: [Infrastructure README](./03-infrastructure/README.md)

---

### 04 - Development

Development practices, testing, standards, integrations, and UI/UX patterns.

#### Subsections:

- **Standards** (5 files): Database conventions, i18n, server actions, optimization
- **Testing** (6 files): Testing guides, webhook testing, email testing
- **Integrations** (5 files): Stripe identity, payouts, layouts, email templates
- **UI/UX** (3 files): Forms, React Hook Form, TipTap editor

📄 **Files:** ~20 documents  
📖 **Start here**: [Development README](./04-development/README.md)

---

### 05 - Guides

Practical how-to guides, troubleshooting, and feature documentation.

#### Subsections:

- **Features** (3 files): Customer ID system, profile publishing, multilingual checkout
- **Troubleshooting** (3 files): Cache fixes, payment verification, payout diagnosis
- **Bot Protection** (1 file): BotID implementation
- **Legacy** (2 files): Historical references

📄 **Files:** ~10 documents  
📖 **Start here**: [Guides README](./05-guides/README.md)

---

### 06 - Legal

Legal compliance, GDPR, audit documentation, and platform clarity.

#### Subsections:

- **Compliance** (6 files): GDPR, DPIA, DPO, CNPD, data breach procedures
- **Audit** (5 files): Legal audits, technical audits, audit call sites
- **Platform** (4 files): Platform vs provider analysis, clarity updates
- **Guides** (1 file): Translation guide

📄 **Files:** ~20 documents  
📖 **Start here**: [Legal README](./06-legal/README.md)

---

### 07 - Project Management

Issue tracking, Linear integration, and project planning.

📄 **Files:** 2 documents  
📖 **Start here**: [Project Management README](./07-project-management/README.md)

---

### 08 - Deployment

Production migration guides and Vercel environment setup.

📄 **Files:** 3 documents  
📖 **Start here**: [Deployment README](./08-deployment/README.md)

---

### 09 - Integrations

Third-party service integration guides and recommendations.

📄 **Files:** 6 documents (React Cookie Manager, Stripe, Svix, BetterStack)  
📖 **Start here**: [Integrations README](./09-integrations/README.md)

---

### Archived

Historical documentation, completed implementations, deprecated features, and outdated plans.

#### Subsections:

- **Completed Implementations**: Redis migration
- **Deprecated Features**: Old testing approaches, role-based auth
- **Outdated Plans**: Redis integration plans

📄 **Files:** ~20 documents  
📖 **Note**: For reference only - not current documentation

---

## 📊 Documentation Statistics

### After Cleanup (January 2025)

- **Total sections**: 9 active + 1 archived
- **Total files**: ~95 focused, current documents (down from ~150+)
- **Duplicates removed**: 14 BetterStack files → 1 comprehensive guide
- **Fixes archived**: 65 ad-hoc fix files deleted
- **Organization**: Sequential numbering, clear structure

### Key Improvements

✅ **Consolidated**: BetterStack (14 files → 1), Clerk cache (4 files → organized)  
✅ **Removed**: 65 fix files, 7 outdated reports, duplicate docs  
✅ **Organized**: Sequential file numbering, clear hierarchy  
✅ **Current**: Only relevant, up-to-date documentation  
✅ **Accessible**: README files for each section

---

## 🔄 Recent Changes (January 2025)

### Major Cleanup & Consolidation

**Deleted:**

- ❌ 65 ad-hoc fix files (completed/superseded)
- ❌ 7 root-level historical reports
- ❌ 14 scattered BetterStack docs (consolidated)
- ❌ 4 duplicate Clerk cache docs (reorganized)
- ❌ Duplicate Novu and payment docs
- ❌ Outdated legal and performance folders

**Consolidated:**

- ✅ BetterStack monitoring into comprehensive guide
- ✅ Clerk cache documentation reorganized
- ✅ Novu docs cleaned and renumbered
- ✅ Payment docs renumbered sequentially
- ✅ Audit docs moved to legal section

**Created:**

- ✅ README files for sections 02-05
- ✅ Clear documentation hierarchy
- ✅ Improved navigation and discoverability

---

## 🎯 Finding What You Need

### By Role

**Developer (New)**

1. [Getting Started](./01-getting-started/01-quick-start.md)
2. [Architecture Overview](./01-getting-started/04-architecture-overview.md)
3. [Core Systems](./02-core-systems/README.md)
4. [Development Standards](./04-development/standards/)

**Developer (Existing)**

1. [Core Systems](./02-core-systems/README.md)
2. [Testing Guides](./04-development/testing/)
3. [Troubleshooting](./05-guides/troubleshooting/)

**DevOps Engineer**

1. [Infrastructure](./03-infrastructure/README.md)
2. [Monitoring](./03-infrastructure/monitoring/01-betterstack-monitoring.md)
3. [Deployment](./08-deployment/README.md)
4. [CI/CD](./03-infrastructure/ci-cd/01-ci-cd-integration.md)

**Product Manager**

1. [API Overview](./01-getting-started/02-api-overview.md)
2. [Payment System](./02-core-systems/payments/README.md)
3. [Features](./05-guides/features/)
4. [Project Management](./07-project-management/README.md)

**Legal/Compliance**

1. [Legal & Compliance](./06-legal/README.md)
2. [GDPR & Privacy](./06-legal/compliance/)
3. [Platform Clarity](./06-legal/platform/)
4. [Audit Docs](./06-legal/audit/)

### By Topic

**Payments**: [Payment System README](./02-core-systems/payments/README.md)  
**Authentication**: [Authentication Docs](./02-core-systems/authentication/)  
**Notifications**: [Novu Integration](./02-core-systems/notifications/01-novu-integration.md)  
**Caching**: [Redis Caching](./02-core-systems/caching/01-redis-caching.md)  
**Monitoring**: [BetterStack Guide](./03-infrastructure/monitoring/01-betterstack-monitoring.md)  
**Testing**: [Testing Guide](./04-development/testing/01-testing-guide.md)  
**i18n**: [Internationalization](./04-development/standards/02-internationalization.md)

---

## 🤝 Contributing to Documentation

### Guidelines

1. **Follow the structure**: Place new docs in the appropriate numbered section
2. **Use descriptive filenames**: Include section numbers for ordering (e.g., `01-feature-name.md`)
3. **Update README files**: Add new files to section README
4. **Cross-reference**: Link to related documentation
5. **Keep current**: Update docs as you build features
6. **Delete outdated**: Remove docs when features are removed/replaced

### Documentation Standards

- **Title**: Clear, descriptive H1 heading
- **Overview**: Brief description of what the doc covers
- **Structure**: Use H2/H3 headings for organization
- **Code examples**: Include practical code snippets
- **Links**: Cross-reference related docs
- **Last updated**: Include date at bottom

---

## 📍 Quick Links

### Most Used Docs

- [Payment System Guide](./02-core-systems/payments/README.md) ⭐
- [BetterStack Monitoring](./03-infrastructure/monitoring/01-betterstack-monitoring.md) ⭐
- [Quick Start Guide](./01-getting-started/01-quick-start.md)
- [Testing Guide](./04-development/testing/01-testing-guide.md)
- [Clerk Configuration](./02-core-systems/authentication/01-clerk-configuration.md)

### External Resources

- [Vercel Dashboard](https://vercel.com/eleva-care)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Neon Database](https://console.neon.tech)
- [BetterStack](https://uptime.betterstack.com)
- [Clerk Dashboard](https://dashboard.clerk.com)

---

**📍 Last Updated**: January 2025  
**🧹 Last Cleanup**: January 2025 - Major consolidation and organization  
**👥 Maintained By**: Engineering Team  
**💬 Questions?** Post in #engineering Slack channel
