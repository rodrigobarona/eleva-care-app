# 📚 Eleva Care Documentation Hub

> **Complete technical documentation for the Eleva Care platform - organized by priority and system area.**

## 🧭 Documentation Structure

Our documentation follows a **hierarchical priority-based system** designed for maximum usability and maintainability. **All markdown files from across the codebase have been centralized here.**

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

## 🚀 Quick Start

### New Team Members

1. **Start here**: [01-getting-started/README.md](./01-getting-started/README.md)
2. **Essential systems**: [02-core-systems/README.md](./02-core-systems/README.md)
3. **Development setup**: [04-development/README.md](./04-development/README.md)
4. **Legal compliance**: [06-legal/README.md](./06-legal/README.md)

### Existing Developers

- **System overview**: [02-core-systems](./02-core-systems/)
- **Infrastructure**: [03-infrastructure](./03-infrastructure/)
- **Development guides**: [04-development](./04-development/)
- **External integrations**: [09-integrations](./09-integrations/)

### Operations & DevOps

- **Monitoring**: [03-infrastructure/monitoring/](./03-infrastructure/monitoring/)
- **Deployment**: [08-deployment/](./08-deployment/)
- **CI/CD**: [03-infrastructure/ci-cd/](./03-infrastructure/ci-cd/)

### Project Management

- **Issue tracking**: [07-project-management/](./07-project-management/)
- **Release planning**: [01-getting-started/CHANGELOG.md](./01-getting-started/CHANGELOG.md)

## 🗂️ Complete File Index

### 01 - Getting Started (Priority: Critical)

```
01-getting-started/
├── README.md                          # Getting started overview
├── CHANGELOG.md                       # Project changelog and release history
├── 01-quick-start.md                  # Essential setup guide
├── 02-api-overview.md                 # API documentation overview
├── 03-expert-user-guide.md            # Expert user functionality
├── 04-architecture-overview.md        # System architecture basics
└── 05-v0.5.0-release-summary.md      # Major release summary
```

### 02 - Core Systems (Priority: Critical)

```
02-core-systems/
├── README.md                          # Core systems overview
├── 06-automation-systems-summary.md   # Automation overview
├── authentication/                    # User authentication & authorization
│   ├── 01-clerk-configuration.md
│   ├── 02-role-management.md
│   ├── 03-permission-system.md
│   └── 04-route-protection.md
├── caching/                          # Redis caching system
│   ├── 01-redis-implementation.md
│   ├── 02-customer-cache.md
│   ├── 03-rate-limiting.md
│   └── 04-redis-integration-guide.md
├── notifications/                    # Novu notification system
│   ├── 01-novu-integration.md
│   ├── 02-notification-workflows.md
│   ├── 03-stripe-novu-integration.md
│   ├── 04-novu-localization-security-fixes.md
│   ├── 05-novu-automation-scripts.md
│   ├── 06-novu-framework-sync-success.md
│   └── 07-novu-workflows-production-ready.md
├── payments/                         # Stripe payment processing
│   ├── README.md
│   ├── 01-payment-flow-analysis.md
│   ├── 02-stripe-integration.md
│   ├── 03-enhanced-payout-processing.md
│   ├── 03-payment-restrictions.md
│   ├── 04-race-condition-fixes.md
│   ├── 05-multibanco-integration.md
│   └── 06-multibanco-reminder-system.md
└── scheduling/                       # Appointment scheduling
    ├── 01-scheduling-engine.md
    └── 02-booking-layout.md
```

### 03 - Infrastructure (Priority: High)

```
03-infrastructure/
├── ci-cd/
│   └── 01-ci-cd-integration.md
├── monitoring/
│   ├── 01-health-check-monitoring.md
│   ├── 02-posthog-analytics.md
│   └── 03-posthog-dashboard.md
└── scheduling/
    ├── 01-cron-jobs.md
    └── 02-qstash-integration.md
```

### 04 - Development (Priority: High)

```
04-development/
├── integrations/
│   ├── 01-stripe-identity.md
│   ├── 02-stripe-payouts.md
│   ├── 03-private-layout.md
│   ├── 04-email-templates.md
│   └── 05-identity-verification-fix.md
├── standards/
│   ├── 01-database-conventions.md
│   ├── 02-internationalization.md
│   └── 03-server-actions.md
├── testing/
│   ├── 01-testing-guide.md
│   ├── 02-webhook-testing.md
│   ├── 03-email-testing-guide.md
│   ├── 04-testing-overview.md
│   ├── 05-testing-summary.md
│   └── 06-webhook-testing-detailed.md
└── ui-ux/
    ├── 01-dashboard-forms-design.md
    ├── 02-react-hook-form-fixes.md
    └── 03-tiptap-editor-fixes.md
```

### 05 - Guides (Priority: Medium)

```
05-guides/
├── features/
│   ├── 01-customer-id-system.md
│   ├── 02-profile-publishing.md
│   └── 03-multilingual-checkout.md
├── legacy/
│   ├── 01-monorepo-migration.md
│   └── 02-customers-section.md
└── troubleshooting/
    ├── 01-customer-cache-fixes.md
    ├── 02-payment-flow-verification.md
    └── 03-payout-diagnosis.md
```

### 06 - Legal (Priority: High)

```
06-legal/
├── README.md                         # Legal documentation overview
├── privacy.md                        # Privacy policy
├── terms.md                          # Terms of service
├── terms2.md                         # Alternative terms version
└── dpa.md                           # Data processing agreement
```

### 07 - Project Management (Priority: Medium)

```
07-project-management/
├── README.md                         # Project management overview
└── 01-linear-issues.md              # Linear issue tracking
```

### 08 - Deployment (Priority: High)

```
08-deployment/
├── README.md                         # Deployment overview
└── 01-production-migration-guide.md # Production deployment guide
```

### 09 - Integrations (Priority: Medium)

```
09-integrations/
├── README.md                         # Integrations overview
├── 01-react-cookie-manager.md       # Cookie consent management
├── 02-stripe-recommendations.md     # Stripe best practices
└── 03-svix-cli.md                   # Svix webhook tools
```

### Archived Documentation

```
archived/
├── README.md
├── completed-implementations/
├── deprecated-features/
└── outdated-plans/
```

## 📊 Documentation Statistics

- **Total sections**: 9 active + 1 archived
- **Documentation files**: 80+ organized markdown files
- **Coverage areas**: All major systems and processes
- **Maintenance**: Centralized in `/docs` for easy management

## 🔄 Recent Organization Changes

**All markdown files from across the codebase have been centralized and organized:**

- ✅ **Root level files** → Moved to appropriate sections
- ✅ **Scattered resources** → Organized by category
- ✅ **Testing documentation** → Consolidated in development section
- ✅ **Legal documents** → New dedicated legal section
- ✅ **Integration guides** → New integrations section
- ✅ **Project management** → New PM section
- ✅ **Deployment guides** → New deployment section

## 🤝 Contributing to Documentation

1. **Follow the folder structure** - Place new docs in the appropriate numbered section
2. **Use descriptive filenames** - Include section numbers for ordering
3. **Update this README** - Add new files to the index above
4. **Link related docs** - Cross-reference related documentation
5. **Keep it current** - Regular reviews and updates

---

**📍 Last Updated**: Documentation reorganization completed - all markdown files centralized and organized by system area and priority.
