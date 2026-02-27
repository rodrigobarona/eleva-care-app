# Dashboard Menu Architecture

**Version:** 2.0  
**Date:** November 12, 2025  
**Status:** 🎨 Design Proposal

---

## Executive Summary

This document defines a scalable, role-aware dashboard navigation structure that supports:

- ✅ Solo practitioners (Phase 1 - Current)
- 🔮 Multi-expert teams (Phase 2 - Future)
- 🔮 eLearning/LMS platform (Phase 3 - Future)
- 🔮 B2B team management (Phase 3 - Future)

**Design Principles:**

1. **Progressive Disclosure**: Show relevant features based on role and plan
2. **Consistent Patterns**: Similar features grouped logically
3. **Scalable Structure**: Easy to add new features without reorganization
4. **Role-Aware**: Different menus for Experts, Admins, Members, Team Managers
5. **Industry Standards**: Inspired by Cal.com, Dub, Vercel, WorkOS dashboards

---

## Navigation Hierarchy

### 🏠 Core Navigation (All Roles)

```
app/
├── (private)/
│   ├── home/                    # Dynamic home based on role
│   ├── calendar/                # Unified calendar view
│   └── notifications/           # Bell icon - notification center
```

---

## 👨‍💼 Member Portal (Members Only) 🆕

### Primary Navigation

```
1. 📊 Overview
   └── /member/dashboard
       ├── Upcoming Appointments
       ├── Recent Session Summaries
       ├── Pending Reviews
       └── Quick Actions

2. 📅 My Appointments
   └── /member/appointments
       ├── /member/appointments/upcoming       # Default view
       ├── /member/appointments/past
       ├── /member/appointments/calendar       # Calendar view
       └── /member/appointments/[id]           # Appointment details
           ├── Session summary/notes
           ├── Reschedule/Cancel
           ├── Join video call
           └── Leave review (after session) 🆕

3. 📝 Session Notes
   └── /member/sessions
       ├── /member/sessions                    # All sessions
       └── /member/sessions/[id]               # Session details
           ├── Expert notes (shared)
           ├─ Recommendations
           └── Related resources

4. ⭐ My Reviews
   └── /member/reviews
       ├── /member/reviews                     # All my reviews
       ├── /member/reviews/pending             # Pending reviews
       └── /member/reviews/[id]                # Edit review

5. 👥 My Experts
   └── /member/experts
       ├── /member/experts                     # Experts I've worked with
       └── /member/experts/[username]          # Expert profile + review

6. 💳 Billing
   └── /member/billing
       ├── /member/billing/payments            # Payment history
       ├── /member/billing/invoices            # Invoices
       └── /member/billing/methods             # Payment methods

7. 👤 Profile
   └── /member/profile
       ├── Personal information
       ├── Health information (optional)
       ├── Emergency contact
       └── Privacy settings
```

### Secondary Navigation

```
8. ⚙️ Settings
   └── /member/settings
       ├── /member/settings/account            # Personal info
       ├── /member/settings/notifications      # Notification preferences
       ├── /member/settings/privacy            # Privacy settings
       └── /member/settings/security           # Security settings
```

---

## 👨‍⚕️ Expert Dashboard (Experts Only)

### Primary Navigation

```
1. 📊 Overview
   └── /dashboard
       ├── Quick Stats (Today's appointments, Revenue, Members)
       ├── Upcoming Appointments
       ├── Recent Activity
       └── Action Items

2. 📅 Appointments
   └── /appointments
       ├── /appointments/upcoming       # Default view (list)
       ├── /appointments/past
       ├── /appointments/calendar       # Week/Month view (built-in calendar)
       │   ├── Day view
       │   ├── Week view
       │   ├── Month view
       │   └── Filter by schedule/location
       └── /appointments/members
           ├── /appointments/members       # Member list
           └── /appointments/members/[id]  # Member details + history

3. 🗓️ Availability
   └── /availability
       ├── /availability/schedules      # Multiple calendars (like Cal.com)
       │   ├── /availability/schedules                    # All schedules list
       │   ├── /availability/schedules/new                # Create new schedule
       │   └── /availability/schedules/[id]              # Edit schedule
       │       ├── Weekly hours
       │       ├── Date overrides & time off
       │       ├── Timezone
       │       └── Default status
       ├── /availability/limits         # Buffer, max bookings
       └── /availability/calendars      # Calendar integrations
           ├── /availability/calendars                    # Connected calendars
           ├── /availability/calendars/connect           # Connect new provider
           └── /availability/calendars/[id]/settings     # Calendar settings

4. 🔗 Event Types
   └── /events
       ├── /events                      # All event types
       ├── /events/new                  # Create new
       └── /events/[slug]
           ├── /events/[slug]/edit      # Edit event
           │   ├── Basic info
           │   ├── Location (Remote, In-person, Phone, etc.)
           │   ├── Schedule assignment (which calendar to use)
           │   ├── Calendar destination (where to save bookings)
           │   └── Availability rules
           └── /events/[slug]/bookings  # Bookings for this event

5. 📈 Analytics
   └── /analytics
       ├── /analytics/overview          # KPIs, Charts
       ├── /analytics/revenue           # Financial analytics
       ├── /analytics/members           # Member insights
       └── /analytics/performance       # Booking trends, conversion

6. 👤 Public Profile
   └── /profile
       ├── /profile/expert              # Public expert profile settings
       ├── /profile/preview             # Preview how members see you
       └── /profile/link                # Your booking link

7. 💳 Billing
   └── /billing
       ├── /billing/subscription        # Current plan
       ├── /billing/payments            # Payment history
       ├── /billing/payouts             # Your earnings & payouts
       └── /billing/invoices            # Generated invoices
```

### Secondary Navigation

```
8. ⚙️ Settings
   └── /settings
       ├── /settings/account            # Personal info, password
       ├── /settings/notifications      # Email, SMS preferences
       ├── /settings/integrations       # Calendar sync, Zoom, etc.
       └── /settings/security           # 2FA, sessions

9. 📚 Resources (Conditional: Top Tier)
   └── /resources
       ├── /resources/library           # Future: LMS content
       ├── /resources/templates         # Future: Session templates
       └── /resources/guides            # Help articles
```

---

## 🏥 Team Dashboard (Team Admins Only)

**Note:** This appears when user is part of a team organization (Phase 2)

### Primary Navigation

```
1. 📊 Team Overview
   └── /team
       ├── Key Metrics (All practitioners)
       ├── Today's Schedule
       ├── Revenue Summary
       └── Quick Actions

2. 👥 Team
   └── /team/team
       ├── /team/team/members         # All practitioners
       ├── /team/team/invite          # Invite new members
       ├── /team/team/roles           # Role management
       └── /team/team/[memberId]      # Member details & analytics

3. 📅 Team Schedule
   └── /team/schedule
       ├── /team/schedule/calendar    # Multi-practitioner calendar
       ├── /team/schedule/rooms       # Room management (future)
       └── /team/schedule/capacity    # Capacity planning

4. 👨‍👩‍👧‍👦 Members
   └── /team/members
       ├── /team/members              # All team members
       ├── /team/members/[id]         # Member records
       └── /team/members/insights     # Member analytics

5. 📊 Team Analytics
   └── /team/analytics
       ├── /team/analytics/revenue    # Team-wide revenue
       ├── /team/analytics/performance # Practitioner performance
       ├── /team/analytics/members    # Member insights
       └── /team/analytics/reports    # Custom reports

6. 💼 Team Settings
   └── /team/settings
       ├── /team/settings/organization # Team info
       ├── /team/settings/branding     # Logo, colors
       ├── /team/settings/billing      # Team subscription
       └── /team/settings/integrations # Team-wide integrations

7. 💳 Revenue & Payouts
   └── /team/revenue
       ├── /team/revenue/overview     # Total revenue
       ├── /team/revenue/splits       # Commission splits
       ├── /team/revenue/payouts      # Payout management
       └── /team/revenue/invoices     # Client invoices
```

---

## 🎓 Learning Platform (Future Phase 3)

**Note:** Appears based on feature flags or subscription tier

### Expert View (Content Creators)

```
1. 📚 My Courses
   └── /learn/courses
       ├── /learn/courses               # My courses
       ├── /learn/courses/new           # Create course
       └── /learn/courses/[id]
           ├── /learn/courses/[id]/edit      # Edit course
           ├── /learn/courses/[id]/students  # Enrolled students
           └── /learn/courses/[id]/analytics # Course analytics

2. 📝 Content Library
   └── /learn/content
       ├── /learn/content/videos        # Video library
       ├── /learn/content/documents     # Documents/PDFs
       ├── /learn/content/quizzes       # Assessments
       └── /learn/content/templates     # Course templates

3. 👨‍🎓 Students
   └── /learn/students
       ├── /learn/students              # All students
       ├── /learn/students/[id]         # Student progress
       └── /learn/students/certificates # Issue certificates
```

### Member/Student View (Learners)

```
1. 🎓 My Learning
   └── /learning
       ├── /learning/dashboard          # Learning dashboard
       ├── /learning/courses            # Enrolled courses
       ├── /learning/progress           # Progress tracking
       └── /learning/certificates       # My certificates

2. 📚 Course Library
   └── /learning/browse
       ├── /learning/browse             # Browse all courses
       ├── /learning/browse/[id]        # Course details
       └── /learning/browse/search      # Search courses
```

---

## 🛠️ Admin Dashboard (Platform Admins Only)

**Note:** Super admin features for platform management

### Primary Navigation

```
1. 🏢 Platform Overview
   └── /admin
       ├── Platform Stats
       ├── Recent Activity
       ├── System Health
       └── Quick Actions

2. 👥 Users
   └── /admin/users
       ├── /admin/users                 # All users
       ├── /admin/users/experts         # Expert users
       ├── /admin/users/members       # Member users
       └── /admin/users/[id]            # User management

3. 🏥 Organizations
   └── /admin/organizations
       ├── /admin/organizations         # All organizations
       ├── /admin/organizations/teams # Team organizations
       └── /admin/organizations/[id]    # Org details

4. 📊 Platform Analytics
   └── /admin/analytics
       ├── /admin/analytics/users       # User growth
       ├── /admin/analytics/revenue     # Platform revenue
       ├── /admin/analytics/engagement  # Usage metrics
       └── /admin/analytics/churn       # Retention analytics

5. 💳 Payments
   └── /admin/payments
       ├── /admin/payments/transactions # All transactions
       ├── /admin/payments/transfers    # Payout transfers
       ├── /admin/payments/disputes     # Payment disputes
       └── /admin/payments/refunds      # Refund management

6. 🏷️ Categories
   └── /admin/categories
       ├── /admin/categories            # Manage categories
       └── /admin/categories/tags       # Tag management

7. ⚙️ Platform Settings
   └── /admin/settings
       ├── /admin/settings/general      # Platform config
       ├── /admin/settings/features     # Feature flags
       ├── /admin/settings/integrations # API keys, webhooks
       └── /admin/settings/security     # Security settings
```

---

## 🎨 Sidebar Component Structure

### Recommended Layout Pattern

```typescript
// components/layout/sidebar/AppSidebar.tsx
<Sidebar>
  <SidebarHeader>
    {/* Logo + Org Switcher (if applicable) */}
  </SidebarHeader>

  <SidebarContent>
    {/* Primary Navigation */}
    <SidebarGroup>
      <NavMain items={primaryNavItems} />
    </SidebarGroup>

    {/* Conditional: Team Section (if team member) */}
    {isTeamMember && (
      <SidebarGroup>
        <SidebarGroupLabel>Team</SidebarGroupLabel>
        <NavMain items={teamNavItems} />
      </SidebarGroup>
    )}

    {/* Conditional: Learning Section (if enabled) */}
    {learningEnabled && (
      <SidebarGroup>
        <SidebarGroupLabel>Learning</SidebarGroupLabel>
        <NavMain items={learningNavItems} />
      </SidebarGroup>
    )}

    {/* Secondary Navigation */}
    <SidebarGroup className="mt-auto">
      <NavSecondary items={secondaryNavItems} />
    </SidebarGroup>
  </SidebarContent>

  <SidebarFooter>
    <NavUser />
  </SidebarFooter>
</Sidebar>
```

---

## 📁 Recommended Folder Structure

```
app/
├── (private)/
│   ├── layout.tsx                      # Auth + Sidebar wrapper (role-based redirect)
│   │
│   ├── dashboard/                      # Expert Home/Overview
│   │   └── page.tsx
│   │
│   ├── member/                         # 🆕 Member Portal
│   │   ├── layout.tsx                 # Member auth check
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Member overview
│   │   ├── appointments/
│   │   │   ├── page.tsx              # Upcoming/Past appointments
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx          # Calendar view
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Appointment details
│   │   │       └── review/
│   │   │           └── page.tsx      # Leave review
│   │   ├── sessions/
│   │   │   ├── page.tsx              # All sessions
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Session details & notes
│   │   ├── reviews/
│   │   │   ├── page.tsx              # All reviews
│   │   │   ├── pending/
│   │   │   │   └── page.tsx          # Pending reviews
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Edit review
│   │   ├── experts/
│   │   │   ├── page.tsx              # My experts
│   │   │   └── [username]/
│   │   │       └── page.tsx          # Expert profile
│   │   ├── billing/
│   │   │   ├── payments/
│   │   │   ├── invoices/
│   │   │   └── methods/
│   │   ├── profile/
│   │   │   └── page.tsx              # Member profile
│   │   └── settings/
│   │       ├── account/
│   │       ├── notifications/
│   │       ├── privacy/
│   │       └── security/
│   │
│   ├── appointments/                   # Appointment management
│   │   ├── page.tsx                   # List view (upcoming/past tabs)
│   │   ├── calendar/                  # 🆕 Built-in calendar view
│   │   │   └── page.tsx              # Day/Week/Month views
│   │   │       ├── Day view
│   │   │       ├── Week view
│   │   │       ├── Month view
│   │   │       └── Filter by schedule/location
│   │   └── members/
│   │       ├── page.tsx
│   │       ├── [id]/
│   │       │   └── page.tsx
│   │       └── layout.tsx
│   │
│   ├── availability/                   # Advanced schedule management
│   │   ├── schedules/                 # 🆕 Multiple schedules (like Cal.com)
│   │   │   ├── page.tsx              # List all schedules
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Create new schedule
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Edit schedule
│   │   │       ├── hours/            # Weekly hours
│   │   │       ├── dates/            # Date overrides
│   │   │       └── location/         # Location settings
│   │   ├── limits/
│   │   │   └── page.tsx              # Buffer, max bookings
│   │   └── calendars/                # 🆕 Calendar integrations
│   │       ├── page.tsx              # Connected calendars
│   │       ├── connect/
│   │       │   └── page.tsx          # Connect new provider
│   │       └── [id]/
│   │           └── settings/
│   │               └── page.tsx      # Calendar settings
│   │
│   ├── events/                         # Event types
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [slug]/
│   │       ├── edit/
│   │       │   └── page.tsx
│   │       └── bookings/
│   │           └── page.tsx
│   │
│   ├── analytics/                      # Analytics & Reports
│   │   ├── page.tsx
│   │   ├── revenue/
│   │   ├── members/
│   │   └── performance/
│   │
│   ├── profile/                        # Public profile settings
│   │   ├── expert/
│   │   ├── preview/
│   │   └── link/
│   │
│   ├── billing/                        # Billing & Subscriptions
│   │   ├── subscription/
│   │   ├── payments/
│   │   ├── payouts/
│   │   └── invoices/
│   │
│   ├── team/                         # 🏥 Team Management (Phase 2)
│   │   ├── layout.tsx                 # Team auth check
│   │   ├── page.tsx                   # Team overview
│   │   ├── team/
│   │   │   ├── page.tsx
│   │   │   ├── invite/
│   │   │   ├── roles/
│   │   │   └── [memberId]/
│   │   ├── schedule/
│   │   ├── members/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── revenue/
│   │
│   ├── learn/                          # 🎓 Learning Platform (Phase 3)
│   │   ├── layout.tsx                 # Feature flag check
│   │   ├── courses/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   ├── content/
│   │   └── students/
│   │
│   ├── learning/                       # 🎓 Student View (Phase 3)
│   │   ├── dashboard/
│   │   ├── courses/
│   │   ├── progress/
│   │   └── browse/
│   │
│   ├── admin/                          # 🛠️ Platform Admin
│   │   ├── layout.tsx                 # Admin auth check
│   │   ├── page.tsx
│   │   ├── users/
│   │   ├── organizations/
│   │   ├── analytics/
│   │   ├── payments/
│   │   ├── categories/
│   │   └── settings/
│   │
│   ├── settings/                       # ⚙️ Personal Settings
│   │   ├── account/
│   │   ├── notifications/
│   │   ├── integrations/
│   │   └── security/
│   │
│   └── notifications/                  # 🔔 Notification Center
│       └── page.tsx
│
└── (public)/
    └── [username]/                     # Public expert profiles
        └── page.tsx
```

---

## 🎯 Role-Based Menu Configuration

### Expert (Solo Practitioner)

**Primary Menu:**

- Overview
- Appointments
- Availability
- Event Types
- Analytics (based on tier)
- Public Profile
- Billing

**Secondary Menu:**

- Settings
- Resources (if top tier)
- Help & Support

---

### Expert (Team Member)

**Primary Menu:**

- Overview (personal)
- My Appointments
- My Availability
- My Event Types
- My Analytics

**Team Section:**

- Team Overview (if admin)
- Team (if admin)
- Team Schedule
- Team Members (shared access)

**Secondary Menu:**

- Settings
- Help & Support

---

### Team Admin

**Primary Menu:**

- Team Overview
- Team
- Team Schedule
- Members
- Team Analytics
- Team Settings
- Revenue & Payouts

**Personal Section:**

- My Schedule
- My Profile
- My Billing

**Secondary Menu:**

- Settings
- Help & Support

---

### Platform Admin

**Primary Menu:**

- Platform Overview
- Users
- Organizations
- Platform Analytics
- Payments
- Categories
- Platform Settings

**Secondary Menu:**

- Audit Logs
- Support Tickets
- System Status

---

## 🎨 UI/UX Best Practices

### Navigation Patterns

1. **Collapsible Sidebar** (Current ✅)
   - Icon mode when collapsed
   - Tooltips in collapsed state
   - Keyboard shortcut: `Cmd/Ctrl + B`

2. **Breadcrumbs** (Current ✅)
   - Show current location
   - Clickable navigation
   - Auto-generated from route

3. **Context Switcher**
   - Organization switcher (for multi-org users)
   - Role indicator badge
   - Quick access to settings

4. **Search Command Palette** (Future)
   - Global search: `Cmd/Ctrl + K`
   - Quick navigation
   - Action shortcuts

### Visual Hierarchy

```typescript
// Menu Item Styling
interface MenuItemStyle {
  primary: {
    fontSize: 'text-sm';
    fontWeight: 'font-medium';
    icon: 'size-4';
  };
  secondary: {
    fontSize: 'text-xs';
    fontWeight: 'font-normal';
    icon: 'size-3.5';
  };
  groupLabel: {
    fontSize: 'text-xs';
    fontWeight: 'font-medium';
    color: 'text-muted-foreground';
  };
}
```

### Icons Recommendation

```typescript
import {
  // Event Types
  BarChart3,
  // Settings
  Bell,
  // Team/Members
  Building2,
  // Overview
  Calendar,
  // Appointments
  Clock,
  // Profile
  CreditCard,
  // Team
  GraduationCap,
  LayoutDashboard,
  // Availability
  Link2,
  // Learning
  Settings,
  // Notifications
  Shield,
  // Admin
  // Analytics
  User,
  // Billing
  Users,
} from 'lucide-react';
```

---

## 🚀 Migration Strategy

### Phase 1: Restructure Current Routes (Week 1-2)

1. **Rename Routes:**
   - `booking/events` → `events`
   - `booking/schedule` → `availability`
   - `booking/expert` → `profile/expert`
   - `appointments` → `appointments` (keep)
   - `dashboard` → `dashboard` (keep)

2. **Create New Routes:**
   - `analytics/` (consolidate analytics)
   - `billing/` (consolidate subscription + payments)
   - `settings/` (consolidate account settings)

3. **Update Sidebar:**
   - Implement new menu structure
   - Add role-based visibility
   - Add icon updates

### Phase 2: Add Team Features (Future)

1. **Create Team Routes:**
   - `team/` (new section)
   - Implement team layout with auth checks

2. **Update Sidebar:**
   - Add team section conditionally
   - Show/hide based on organization membership

### Phase 3: Add Learning Platform (Future)

1. **Create Learning Routes:**
   - `learn/` (expert view)
   - `learning/` (student view)

2. **Feature Flag:**
   - Enable based on subscription tier
   - Progressive rollout

---

## 📊 Analytics & Metrics

### Track Navigation Patterns

```typescript
// Track which menu items are used most
analytics.track('navigation_click', {
  from: currentPath,
  to: targetPath,
  menuItem: itemName,
  userRole: role,
});

// Track feature discovery
analytics.track('feature_discovered', {
  feature: featureName,
  userRole: role,
  daysFromSignup: daysSinceSignup,
});
```

---

## ✅ Implementation Checklist

### Phase 1: Core Restructure

- [ ] Create new folder structure
- [ ] Migrate existing pages
- [ ] Update AppSidebar component
- [ ] Add role-based menu logic
- [ ] Update breadcrumbs
- [ ] Add icons
- [ ] Update navigation links across app
- [ ] Test all routes
- [ ] Update documentation

### Phase 2: Team Features

- [ ] Design team data model
- [ ] Implement team routes
- [ ] Add team sidebar section
- [ ] Implement organization switcher
- [ ] Add team-specific permissions
- [ ] Test multi-member scenarios

### Phase 3: Learning Platform

- [ ] Design LMS data model
- [ ] Implement course routes
- [ ] Add learning sidebar section
- [ ] Implement feature flags
- [ ] Add course management UI
- [ ] Test content delivery

---

## 🔗 References

- **Cal.com Dashboard:** Event-centric navigation with clear scheduling focus
- **Dub Dashboard:** Analytics-first with clean feature separation
- **Vercel Dashboard:** Project-centric with team features
- **WorkOS Dashboard:** Organization management and RBAC
- **WorkOS RBAC:** `_docs/02-core-systems/WORKOS-RBAC-QUICK-REFERENCE.md`
- **Solo vs Team:** `.cursor/plans/SOLO-VS-CLINIC-ARCHITECTURE.md`

---

**Next Steps:**

1. Review and approve this architecture
2. Create implementation plan with timeline
3. Start with Phase 1 migration
4. Gather user feedback
5. Iterate based on usage patterns
