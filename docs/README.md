# 📚 Eleva Care Documentation Hub

> **Complete technical documentation for the Eleva Care platform - organized by priority and system area.**

## 🧭 Documentation Structure

Our documentation follows a **hierarchical priority-based system** designed for maximum usability and maintainability.

### 📁 Folder Organization

| Folder                 | Purpose                                               | Target Audience              | Priority    |
| ---------------------- | ----------------------------------------------------- | ---------------------------- | ----------- |
| **01-getting-started** | Quick start guides, onboarding, essential setup       | New developers, stakeholders | 🔴 Critical |
| **02-core-systems**    | Main application systems (payments, auth, scheduling) | All developers               | 🔴 Critical |
| **03-infrastructure**  | DevOps, deployment, monitoring, CI/CD                 | DevOps, senior developers    | 🟡 High     |
| **04-development**     | Development guides, testing, code standards           | All developers               | 🟡 High     |
| **05-guides**          | How-to guides, troubleshooting, best practices        | All team members             | 🟢 Medium   |
| **archived**           | Legacy, outdated, or completed implementation docs    | Reference only               | ⚪ Low      |

## 🚀 Quick Start

### New Team Members

1. **Start here**: [01-getting-started/README.md](./01-getting-started/README.md)
2. **Essential systems**: [02-core-systems/README.md](./02-core-systems/README.md)
3. **Development setup**: [04-development/README.md](./04-development/README.md)

### Existing Developers

- **System overview**: [02-core-systems](./02-core-systems/)
- **Infrastructure**: [03-infrastructure](./03-infrastructure/)
- **Development guides**: [04-development](./04-development/)

### Operations & DevOps

- **Monitoring**: [03-infrastructure/monitoring/](./03-infrastructure/monitoring/)
- **CI/CD**: [03-infrastructure/ci-cd/](./03-infrastructure/ci-cd/)
- **Health checks**: [03-infrastructure/health-monitoring/](./03-infrastructure/health-monitoring/)

## 🗂️ Complete File Index

### 01 - Getting Started (Priority: Critical)

```
01-getting-started/
├── README.md                          # Getting started overview
├── 01-quick-start.md                  # Essential setup guide
├── 02-api-overview.md                 # API documentation overview
├── 03-expert-user-guide.md            # Expert user functionality
└── 04-architecture-overview.md        # System architecture basics
```

### 02 - Core Systems (Priority: Critical)

```
02-core-systems/
├── README.md                          # Core systems overview
├── payments/
│   ├── 01-payment-flow-analysis.md    # Complete payment system
│   ├── 02-stripe-integration.md       # Stripe setup & webhooks
│   ├── 03-payment-restrictions.md     # Payment method rules
│   └── 04-race-condition-fixes.md     # Atomic transaction fixes
├── scheduling/
│   ├── 01-scheduling-engine.md        # Core scheduling logic
│   └── 02-booking-layout.md           # Booking interface
├── notifications/
│   ├── 01-novu-integration.md         # Notification system
│   ├── 02-notification-workflows.md   # Workflow definitions
│   ├── 03-stripe-novu-integration.md  # Payment notifications
│   ├── 04-novu-localization-security-fixes.md # i18n & XSS fixes
│   └── 05-novu-automation-scripts.md  # API automation & setup
├── authentication/
│   ├── 01-clerk-configuration.md      # Auth system setup
│   └── 02-user-management.md          # User role management
└── caching/
    ├── 01-redis-implementation.md     # Redis caching system
    └── 02-cache-optimization.md       # Performance optimization
└── 06-automation-systems-summary.md   # PostHog & Novu automation
```

### 03 - Infrastructure (Priority: High)

```
03-infrastructure/
├── README.md                          # Infrastructure overview
├── ci-cd/
│   ├── 01-ci-cd-integration.md        # GitHub Actions setup
│   └── 02-deployment-process.md       # Deployment workflows
├── monitoring/
│   ├── 01-health-check-monitoring.md  # System health monitoring
│   ├── 02-posthog-analytics.md        # Analytics setup
│   └── 03-posthog-dashboard.md        # Dashboard configuration
├── caching/
│   ├── 01-redis-architecture.md       # Redis infrastructure
│   └── 02-cache-strategies.md         # Caching patterns
└── scheduling/
    ├── 01-cron-jobs.md                # Scheduled tasks
    └── 02-qstash-integration.md       # QStash setup
```

### 04 - Development (Priority: High)

```
04-development/
├── README.md                          # Development overview
├── testing/
│   ├── 01-testing-guide.md            # Testing strategies
│   └── 02-webhook-testing.md          # Webhook test patterns
├── ui-ux/
│   ├── 01-dashboard-forms-design.md   # Form design system
│   ├── 02-react-hook-form-fixes.md    # Form optimization
│   └── 03-tiptap-editor-fixes.md      # Rich text editor
├── integrations/
│   ├── 01-stripe-identity.md          # Identity verification
│   ├── 02-stripe-payouts.md           # Payout configuration
│   └── 03-private-layout.md           # Private layout integration
└── standards/
    ├── 01-database-conventions.md     # Database naming standards
    └── 02-internationalization.md     # i18n implementation
```

### 05 - Guides (Priority: Medium)

```
05-guides/
├── README.md                          # Guides overview
├── troubleshooting/
│   ├── 01-customer-cache-fixes.md     # Cache troubleshooting
│   └── 02-payment-flow-verification.md # Payment debugging
├── features/
│   ├── 01-customer-id-system.md       # Customer ID implementation
│   ├── 02-profile-publishing.md       # Profile features
│   └── 03-multilingual-checkout.md    # Internationalized checkout
└── legacy/
    ├── 01-monorepo-migration.md       # Migration planning
    └── 02-customers-section.md        # Customer management
```

### Archived (Reference Only)

```
archived/
├── README.md                          # Archive index
├── completed-implementations/
│   ├── redis-migration-completion.md  # Completed Redis work
│   ├── customer-cache-type-fix.md     # Completed bug fix
│   └── race-condition-fix-summary.md  # Completed race fix
├── outdated-plans/
│   ├── redis-integration-plans/       # Outdated Redis plans
│   └── temp-data-cache-plan.md        # Superseded plans
└── deprecated-features/
    ├── api-check-kv-sync-endpoint.md  # Deprecated API docs
    └── qstash-setup-guides/           # QStash legacy docs
```

## 🏷️ Document Status Legend

| Status          | Description                       | Action Required  |
| --------------- | --------------------------------- | ---------------- |
| 🟢 **Active**   | Current, maintained documentation | Regular updates  |
| 🟡 **Stable**   | Complete, infrequently updated    | Review quarterly |
| 🔴 **Critical** | Essential for operations          | Monitor closely  |
| ⚪ **Archived** | Historical reference only         | No maintenance   |

## 🔍 How to Find What You Need

### By Role

- **New Developer**: Start with [01-getting-started](./01-getting-started/)
- **Frontend Developer**: Focus on [04-development/ui-ux](./04-development/ui-ux/)
- **Backend Developer**: Prioritize [02-core-systems](./02-core-systems/)
- **DevOps Engineer**: Begin with [03-infrastructure](./03-infrastructure/)
- **Product Manager**: Review [01-getting-started](./01-getting-started/) and [05-guides](./05-guides/)

### By System

- **Payment Issues**: [02-core-systems/payments/](./02-core-systems/payments/)
- **Scheduling Problems**: [02-core-systems/scheduling/](./02-core-systems/scheduling/)
- **Authentication**: [02-core-systems/authentication/](./02-core-systems/authentication/)
- **Performance**: [03-infrastructure/monitoring/](./03-infrastructure/monitoring/)
- **Testing**: [04-development/testing/](./04-development/testing/)

### By Urgency

1. **Production Issues**: [02-core-systems](./02-core-systems/) + [03-infrastructure/monitoring](./03-infrastructure/monitoring/)
2. **Development Blockers**: [04-development](./04-development/)
3. **Feature Implementation**: [05-guides](./05-guides/)
4. **Research/Planning**: [archived](./archived/)

## 📝 Documentation Standards

### File Naming Convention

```
[number]-[descriptive-name].md
```

Examples: `01-payment-flow-analysis.md`, `02-stripe-integration.md`

### Content Structure

1. **Overview** - What this document covers
2. **Prerequisites** - What you need to know first
3. **Implementation** - Step-by-step instructions
4. **Examples** - Code snippets and use cases
5. **Troubleshooting** - Common issues and solutions
6. **References** - Related documentation and links

### Maintenance Schedule

- **Monthly**: Review critical documentation (🔴)
- **Quarterly**: Update stable documentation (🟡)
- **As-needed**: Maintain active documentation (🟢)
- **Never**: Archived documentation (⚪)

## 🤝 Contributing to Documentation

1. **Update existing docs**: Follow the established structure
2. **Create new docs**: Use the appropriate folder and numbering
3. **Archive outdated docs**: Move to `archived/` with explanation
4. **Review process**: All doc changes should be reviewed by team lead

## 📊 Documentation Health

| Metric                    | Target | Current Status             |
| ------------------------- | ------ | -------------------------- |
| Critical docs up-to-date  | 100%   | ✅ Active monitoring       |
| Broken links              | 0      | 🔄 Regular audits          |
| Outdated content          | <5%    | 🔄 Quarterly reviews       |
| Missing docs for features | 0      | 🔄 Development integration |

---

## 📞 Support

- **Documentation questions**: Review this README first
- **Missing documentation**: Create an issue with the "documentation" label
- **Urgent documentation needs**: Tag the team lead directly

**Last updated**: January 1, 2025 | **Next review**: April 1, 2025
