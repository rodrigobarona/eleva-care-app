# Archived Components

This directory contains components that are no longer actively used in the application but are preserved for reference or potential future use.

## Why Archive Instead of Delete?

- **Historical Reference**: These components may contain useful patterns or logic
- **Easy Recovery**: If needed, components can be quickly restored
- **Documentation**: Shows evolution of the codebase
- **Code Reuse**: May contain reusable patterns for future features

## Archive Date

**October 30, 2025** - Migrated during feature-based architecture refactor

## Archived Components (22 total)

### Features (3)

- `expert-setup/ExpertSetupBannerWrapper.tsx` - Wrapper for expert setup banner
- `expert-setup/ExpertSetupChecklistWrapper.tsx` - Wrapper for expert setup checklist
- `forms/PaymentStep.tsx` - Payment step form component

### Layout (5)

- `footer/FooterContentWrapper.tsx` - Footer content wrapper
- `header/HeaderContent.tsx` - Header content component
- `sidebar/AppBreadcrumbContent.tsx` - Breadcrumb content
- `sidebar/NavMainContent.tsx` - Main navigation content
- `UserNavNotifications.tsx` - User notifications nav item

### Sections (7)

- `about/ClinicalExpertsSection.tsx` - Clinical experts about section
- `home/HeroSection.tsx` - Alternative hero section
- `home/MissionSection.tsx` - Home mission section (replaced by about)
- `home/NewsletterSection.tsx` - Newsletter signup section
- `home/PodcastSection.tsx` - Podcast section
- `home/SocialSection.tsx` - Social media section
- `home/TeamSection.tsx` - Team section (may have duplicate in about)

### Shared (4)

- `ErrorFallback.tsx` - Error fallback UI component
- `i18n/LocaleSwitcherSelect.tsx` - Locale switcher select component
- `navigation/NavLink.tsx` - Navigation link component
- `navigation/NavLinkContent.tsx` - Navigation link content

### UI (2)

- `scroll-area.tsx` - Shadcn/ui scroll area component
- `toggle.tsx` - Shadcn/ui toggle component

### Integrations (1)

- `stripe/StripeConnectEmbed.tsx` - Stripe Connect embedded component

## How to Restore

If you need to restore a component:

```bash
# Example: Restore PaymentStep
mv components/_archive/features/forms/PaymentStep.tsx components/features/forms/

# Update imports in files that use it
# Run tests to ensure it works correctly
```

## Notes

- These components were identified as unused during automated analysis on October 30, 2025
- Components like `sonner.tsx`, `toast.tsx`, `ProfileAccessControl.tsx` were initially flagged but are actually used (runtime imports, providers, etc.)
- Some components may have been temporarily unused but could be needed for future features

## Cleanup Policy

Archive components can be permanently deleted after:

- 6 months with no restoration requests
- Confirmed obsolescence during major version upgrades
- Team decision in architecture reviews
