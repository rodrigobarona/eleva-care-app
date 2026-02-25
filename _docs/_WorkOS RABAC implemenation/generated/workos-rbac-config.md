# WorkOS RBAC Configuration

**Generated:** 2026-02-25T17:40:39.576Z
**Total Permissions:** 132
**Total Roles:** 6

## Table of Contents

- [Permissions by Category](#permissions-by-category)
- [Roles Overview](#roles-overview)
- [Role-Permission Matrix](#role-permission-matrix)
- [Copy-Paste Format](#copy-paste-format)

## Permissions by Category

### Appointments (9)

| Slug | Name | Description |
|------|------|-------------|
| `appointments:view_own` | View Own Appointments | View own appointments |
| `appointments:view_incoming` | View Incoming Appointments | View appointments booked with you |
| `appointments:create` | Create Appointments | Book new appointments |
| `appointments:manage_own` | Manage Own Appointments | Manage own bookings |
| `appointments:cancel_own` | Cancel Own Appointments | Cancel own appointments (within policy) |
| `appointments:reschedule_own` | Reschedule Own Appointments | Reschedule own appointments |
| `appointments:view_calendar` | View Calendar | View calendar view |
| `appointments:confirm` | Confirm Appointments | Confirm appointments |
| `appointments:complete` | Complete Appointments | Mark appointments as completed |

### Sessions (2)

| Slug | Name | Description |
|------|------|-------------|
| `sessions:view_own` | View Own Sessions | View own session notes |
| `sessions:view_history` | View Session History | View session history |

### Patients (7)

| Slug | Name | Description |
|------|------|-------------|
| `patients:view_own` | View Own Patients | View own patients |
| `patients:view_all` | View All Patients | View all team patient records |
| `patients:view_history` | View Patient History | View patient appointment history |
| `patients:send_notes` | Send Patient Notes | Share session notes with patients |
| `patients:manage_records` | Manage Patient Records | Manage patient records |
| `patients:view_insights` | View Patient Insights | View patient analytics |
| `patients:export` | Export Patient Data | Export patient data |

### Events (5)

| Slug | Name | Description |
|------|------|-------------|
| `events:create` | Create Events | Create event types |
| `events:view_own` | View Own Events | View own events |
| `events:edit_own` | Edit Own Events | Edit own events |
| `events:delete_own` | Delete Own Events | Delete own events |
| `events:toggle_active` | Toggle Event Active Status | Activate/deactivate events |

### Availability (5)

| Slug | Name | Description |
|------|------|-------------|
| `availability:view_own` | View Own Availability | View own availability |
| `availability:create` | Create Availability | Create schedules |
| `availability:edit_own` | Edit Own Availability | Edit schedules |
| `availability:delete_own` | Delete Own Availability | Delete schedules |
| `availability:set_limits` | Set Availability Limits | Set buffer times and max bookings |

### Calendars (4)

| Slug | Name | Description |
|------|------|-------------|
| `calendars:connect` | Connect Calendars | Connect external calendars |
| `calendars:view_own` | View Own Calendars | View connected calendars |
| `calendars:edit_own` | Edit Own Calendars | Edit calendar settings |
| `calendars:disconnect` | Disconnect Calendars | Disconnect calendars |

### Reviews (6)

| Slug | Name | Description |
|------|------|-------------|
| `reviews:create` | Create Reviews | Leave reviews after sessions |
| `reviews:view_own` | View Own Reviews | View own reviews |
| `reviews:view_about_me` | View Reviews About Me | View reviews about me |
| `reviews:edit_own` | Edit Own Reviews | Edit own reviews (within 30 days) |
| `reviews:delete_own` | Delete Own Reviews | Delete own reviews (within 7 days) |
| `reviews:respond` | Respond to Reviews | Respond to reviews |

### Profile (6)

| Slug | Name | Description |
|------|------|-------------|
| `profile:view_own` | View Own Profile | View own profile |
| `profile:edit_own` | Edit Own Profile | Edit own profile |
| `profile:view_expert` | View Expert Profile | View expert profile |
| `profile:edit_expert` | Edit Expert Profile | Edit expert profile |
| `profile:preview` | Preview Profile | Preview public profile |
| `profile:manage_link` | Manage Booking Link | Manage booking link |

### Experts (7)

| Slug | Name | Description |
|------|------|-------------|
| `experts:browse` | Browse Experts | Browse expert directory |
| `experts:view_profiles` | View Expert Profiles | View expert profiles |
| `experts:view_applications` | View Expert Applications | View expert applications |
| `experts:approve` | Approve Expert Applications | Approve expert applications |
| `experts:reject` | Reject Expert Applications | Reject expert applications |
| `experts:suspend` | Suspend Experts | Suspend expert accounts |
| `experts:verify` | Verify Expert Credentials | Verify expert credentials |

### Analytics (10)

| Slug | Name | Description |
|------|------|-------------|
| `analytics:view` | View Analytics | Access analytics dashboard |
| `analytics:revenue` | View Revenue Analytics | View revenue analytics |
| `analytics:patients` | View Patient Analytics | View patient insights |
| `analytics:performance` | View Performance Analytics | View performance metrics |
| `analytics:export` | Export Analytics | Export analytics data |
| `analytics:platform_growth` | View Platform Growth | View platform growth |
| `analytics:platform_revenue` | View Platform Revenue | View platform revenue |
| `analytics:platform_engagement` | View Platform Engagement | View platform engagement |
| `analytics:platform_churn` | View Platform Churn | View platform churn |
| `analytics:platform_export` | Export Platform Analytics | Export platform data |

### Branding (3)

| Slug | Name | Description |
|------|------|-------------|
| `branding:customize` | Customize Branding | Customize branding |
| `branding:upload_logo` | Upload Logo | Upload custom logo |
| `branding:custom_colors` | Customize Colors | Set custom colors |

### Billing (8)

| Slug | Name | Description |
|------|------|-------------|
| `billing:view_own` | View Own Billing | View own billing |
| `billing:view_earnings` | View Earnings | View earnings |
| `billing:view_payouts` | View Payouts | View payouts |
| `billing:view_subscription` | View Subscription | View subscription |
| `billing:manage_subscription` | Manage Subscription | Manage subscription |
| `billing:methods_manage` | Manage Payment Methods | Manage payment methods |
| `billing:manage_team_sub` | Manage Team Subscription | Manage team subscription |
| `billing:view_team_billing` | View Team Billing | View team billing |

### Settings (7)

| Slug | Name | Description |
|------|------|-------------|
| `settings:view_own` | View Own Settings | View own settings |
| `settings:edit_own` | Edit Own Settings | Edit own settings |
| `settings:security` | Manage Security Settings | Manage security (2FA, sessions) |
| `settings:view_platform` | View Platform Settings | View platform settings |
| `settings:edit_platform` | Edit Platform Settings | Edit platform settings |
| `settings:manage_features` | Manage Feature Flags | Manage feature flags |
| `settings:manage_integrations` | Manage Integrations | Manage integrations (API, webhooks) |

### Dashboard (2)

| Slug | Name | Description |
|------|------|-------------|
| `dashboard:view_expert` | View Expert Dashboard | Access expert dashboard |
| `dashboard:view_member` | View Member Dashboard | Access member dashboard |

### Users (6)

| Slug | Name | Description |
|------|------|-------------|
| `users:view_all` | View All Users | View all users |
| `users:create` | Create Users | Create users |
| `users:edit` | Edit Users | Edit users |
| `users:delete` | Delete Users | Delete users (soft delete) |
| `users:manage_roles` | Manage User Roles | Manage user roles |
| `users:impersonate` | Impersonate Users | Impersonate users (support) |

### Organizations (5)

| Slug | Name | Description |
|------|------|-------------|
| `organizations:view_all` | View All Organizations | View all organizations |
| `organizations:create` | Create Organizations | Create organizations |
| `organizations:edit` | Edit Organizations | Edit organizations |
| `organizations:delete` | Delete Organizations | Delete organizations |
| `organizations:manage_settings` | Manage Organization Settings | Manage organization settings |

### Payments (5)

| Slug | Name | Description |
|------|------|-------------|
| `payments:view_all` | View All Payments | View all transactions |
| `payments:view_transfers` | View Payment Transfers | View transfers |
| `payments:manage_disputes` | Manage Payment Disputes | Manage disputes |
| `payments:process_refunds` | Process Refunds | Process refunds |
| `payments:retry_failed` | Retry Failed Payments | Retry failed payments |

### Categories (4)

| Slug | Name | Description |
|------|------|-------------|
| `categories:create` | Create Categories | Create categories |
| `categories:edit` | Edit Categories | Edit categories |
| `categories:delete` | Delete Categories | Delete categories |
| `categories:manage_tags` | Manage Tags | Manage tags |

### Moderation (4)

| Slug | Name | Description |
|------|------|-------------|
| `moderation:view_flags` | View Flagged Content | View flagged content |
| `moderation:review_content` | Review Flagged Content | Review content |
| `moderation:remove_content` | Remove Content | Remove content |
| `moderation:ban_users` | Ban Users | Ban users |

### Audit (4)

| Slug | Name | Description |
|------|------|-------------|
| `audit:view_logs` | View Audit Logs | View audit logs |
| `audit:export_logs` | Export Audit Logs | Export audit logs |
| `audit:view_reports` | View Audit Reports | View reports |
| `audit:generate_reports` | Generate Audit Reports | Generate reports |

### Support (4)

| Slug | Name | Description |
|------|------|-------------|
| `support:view_tickets` | View Support Tickets | View tickets |
| `support:respond_tickets` | Respond to Tickets | Respond to tickets |
| `support:escalate` | Escalate Tickets | Escalate tickets |
| `support:close_tickets` | Close Tickets | Close tickets |

### Team (11)

| Slug | Name | Description |
|------|------|-------------|
| `team:view_dashboard` | View Team Dashboard | View team overview |
| `team:view_patients` | View Team Patients | View shared team patients |
| `team:manage_settings` | Manage Team Settings | Manage team settings |
| `team:manage_branding` | Manage Team Branding | Manage team branding |
| `team:view_analytics` | View Team Analytics | View team analytics |
| `team:export_data` | Export Team Data | Export team data |
| `team:view_members` | View Team Members | View team members |
| `team:invite_members` | Invite Team Members | Invite members |
| `team:remove_members` | Remove Team Members | Remove members |
| `team:manage_roles` | Manage Team Roles | Manage roles |
| `team:view_performance` | View Team Performance | View performance |

### Schedule (3)

| Slug | Name | Description |
|------|------|-------------|
| `schedule:manage_team` | Manage Team Schedule | Manage team schedule |
| `schedule:manage_rooms` | Manage Rooms | Manage rooms |
| `schedule:view_capacity` | View Capacity Planning | View capacity planning |

### Revenue (5)

| Slug | Name | Description |
|------|------|-------------|
| `revenue:view_overview` | View Revenue Overview | View revenue overview |
| `revenue:view_splits` | View Commission Splits | View commission splits |
| `revenue:manage_payouts` | Manage Payouts | Manage payouts |
| `revenue:view_invoices` | View Invoices | View invoices |
| `revenue:export_financial` | Export Financial Data | Export financial data |

## Roles Overview

| Role | Priority | Inherits From | Total Permissions | Description |
|------|----------|---------------|-------------------|-------------|
| **Member** | 10 | - | 16 | Base role for all registered users. Can book appointments and access member features |
| **Expert Community** | 70 | member | 52 | Standard expert tier with core expert features. Pays 20% commission (monthly) or 12% (annual) |
| **Expert Top** | 80 | expert_community | 60 | Premium expert tier with advanced features. Pays 18% commission (monthly) or 8% (annual) |
| **Team Member** | 60 | expert_community | 55 | Member of a team organization. Can manage their own practice and view shared team resources |
| **Team Admin** | 90 | team_member | 77 | Administrator of a team organization. Can manage team, patients, schedule, and settings |
| **Admin** | 100 | - | 132 | Platform-level administrator with full system access. For Eleva Care team only |

## Role-Permission Matrix

| Permission | Member | Expert Community | Expert Top | Team Member | Team Admin | Admin |
|------------|---|---|---|---|---|---|
| `appointments:view_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:view_incoming` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:create` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:manage_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:cancel_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:reschedule_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:view_calendar` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:confirm` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `appointments:complete` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `sessions:view_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `sessions:view_history` | ` | ` | ` | ` | ` | ✓ |
| `patients:view_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `patients:view_all` | ` | ` | ` | ` | ✓` | ✓ |
| `patients:view_history` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `patients:send_notes` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `patients:manage_records` | ` | ` | ` | ` | ✓` | ✓ |
| `patients:view_insights` | ` | ` | ` | ` | ✓` | ✓ |
| `patients:export` | ` | ` | ` | ` | ✓` | ✓ |
| `events:create` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `events:view_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `events:edit_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `events:delete_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `events:toggle_active` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `availability:view_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `availability:create` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `availability:edit_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `availability:delete_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `availability:set_limits` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `calendars:connect` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `calendars:view_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `calendars:edit_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `calendars:disconnect` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `reviews:create` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `reviews:view_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `reviews:view_about_me` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `reviews:edit_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `reviews:delete_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `reviews:respond` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `profile:view_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `profile:edit_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `profile:view_expert` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `profile:edit_expert` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `profile:preview` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `profile:manage_link` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `experts:browse` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `experts:view_profiles` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `experts:view_applications` | ` | ` | ` | ` | ` | ✓ |
| `experts:approve` | ` | ` | ` | ` | ` | ✓ |
| `experts:reject` | ` | ` | ` | ` | ` | ✓ |
| `experts:suspend` | ` | ` | ` | ` | ` | ✓ |
| `experts:verify` | ` | ` | ` | ` | ` | ✓ |
| `analytics:view` | ` | ` | ✓` | ` | ` | ✓ |
| `analytics:revenue` | ` | ` | ✓` | ` | ` | ✓ |
| `analytics:patients` | ` | ` | ✓` | ` | ` | ✓ |
| `analytics:performance` | ` | ` | ✓` | ` | ` | ✓ |
| `analytics:export` | ` | ` | ✓` | ` | ` | ✓ |
| `analytics:platform_growth` | ` | ` | ` | ` | ` | ✓ |
| `analytics:platform_revenue` | ` | ` | ` | ` | ` | ✓ |
| `analytics:platform_engagement` | ` | ` | ` | ` | ` | ✓ |
| `analytics:platform_churn` | ` | ` | ` | ` | ` | ✓ |
| `analytics:platform_export` | ` | ` | ` | ` | ` | ✓ |
| `branding:customize` | ` | ` | ✓` | ` | ` | ✓ |
| `branding:upload_logo` | ` | ` | ✓` | ` | ` | ✓ |
| `branding:custom_colors` | ` | ` | ✓` | ` | ` | ✓ |
| `billing:view_own` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `billing:view_earnings` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `billing:view_payouts` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `billing:view_subscription` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `billing:manage_subscription` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `billing:methods_manage` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `billing:manage_team_sub` | ` | ` | ` | ` | ✓` | ✓ |
| `billing:view_team_billing` | ` | ` | ` | ` | ✓` | ✓ |
| `settings:view_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `settings:edit_own` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `settings:security` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `settings:view_platform` | ` | ` | ` | ` | ` | ✓ |
| `settings:edit_platform` | ` | ` | ` | ` | ` | ✓ |
| `settings:manage_features` | ` | ` | ` | ` | ` | ✓ |
| `settings:manage_integrations` | ` | ` | ` | ` | ` | ✓ |
| `dashboard:view_expert` | ` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `dashboard:view_member` | ✓` | ✓` | ✓` | ✓` | ✓` | ✓ |
| `users:view_all` | ` | ` | ` | ` | ` | ✓ |
| `users:create` | ` | ` | ` | ` | ` | ✓ |
| `users:edit` | ` | ` | ` | ` | ` | ✓ |
| `users:delete` | ` | ` | ` | ` | ` | ✓ |
| `users:manage_roles` | ` | ` | ` | ` | ` | ✓ |
| `users:impersonate` | ` | ` | ` | ` | ` | ✓ |
| `organizations:view_all` | ` | ` | ` | ` | ` | ✓ |
| `organizations:create` | ` | ` | ` | ` | ` | ✓ |
| `organizations:edit` | ` | ` | ` | ` | ` | ✓ |
| `organizations:delete` | ` | ` | ` | ` | ` | ✓ |
| `organizations:manage_settings` | ` | ` | ` | ` | ` | ✓ |
| `payments:view_all` | ` | ` | ` | ` | ` | ✓ |
| `payments:view_transfers` | ` | ` | ` | ` | ` | ✓ |
| `payments:manage_disputes` | ` | ` | ` | ` | ` | ✓ |
| `payments:process_refunds` | ` | ` | ` | ` | ` | ✓ |
| `payments:retry_failed` | ` | ` | ` | ` | ` | ✓ |
| `categories:create` | ` | ` | ` | ` | ` | ✓ |
| `categories:edit` | ` | ` | ` | ` | ` | ✓ |
| `categories:delete` | ` | ` | ` | ` | ` | ✓ |
| `categories:manage_tags` | ` | ` | ` | ` | ` | ✓ |
| `moderation:view_flags` | ` | ` | ` | ` | ` | ✓ |
| `moderation:review_content` | ` | ` | ` | ` | ` | ✓ |
| `moderation:remove_content` | ` | ` | ` | ` | ` | ✓ |
| `moderation:ban_users` | ` | ` | ` | ` | ` | ✓ |
| `audit:view_logs` | ` | ` | ` | ` | ` | ✓ |
| `audit:export_logs` | ` | ` | ` | ` | ` | ✓ |
| `audit:view_reports` | ` | ` | ` | ` | ` | ✓ |
| `audit:generate_reports` | ` | ` | ` | ` | ` | ✓ |
| `support:view_tickets` | ` | ` | ` | ` | ` | ✓ |
| `support:respond_tickets` | ` | ` | ` | ` | ` | ✓ |
| `support:escalate` | ` | ` | ` | ` | ` | ✓ |
| `support:close_tickets` | ` | ` | ` | ` | ` | ✓ |
| `team:view_dashboard` | ` | ` | ` | ✓` | ✓` | ✓ |
| `team:view_patients` | ` | ` | ` | ✓` | ✓` | ✓ |
| `team:manage_settings` | ` | ` | ` | ` | ✓` | ✓ |
| `team:manage_branding` | ` | ` | ` | ` | ✓` | ✓ |
| `team:view_analytics` | ` | ` | ` | ` | ✓` | ✓ |
| `team:export_data` | ` | ` | ` | ` | ✓` | ✓ |
| `team:view_members` | ` | ` | ` | ✓` | ✓` | ✓ |
| `team:invite_members` | ` | ` | ` | ` | ✓` | ✓ |
| `team:remove_members` | ` | ` | ` | ` | ✓` | ✓ |
| `team:manage_roles` | ` | ` | ` | ` | ✓` | ✓ |
| `team:view_performance` | ` | ` | ` | ` | ✓` | ✓ |
| `schedule:manage_team` | ` | ` | ` | ` | ✓` | ✓ |
| `schedule:manage_rooms` | ` | ` | ` | ` | ✓` | ✓ |
| `schedule:view_capacity` | ` | ` | ` | ` | ✓` | ✓ |
| `revenue:view_overview` | ` | ` | ` | ` | ✓` | ✓ |
| `revenue:view_splits` | ` | ` | ` | ` | ✓` | ✓ |
| `revenue:manage_payouts` | ` | ` | ` | ` | ✓` | ✓ |
| `revenue:view_invoices` | ` | ` | ` | ` | ✓` | ✓ |
| `revenue:export_financial` | ` | ` | ` | ` | ✓` | ✓ |

## Copy-Paste Format

### All Permissions

```
appointments:view_own | View Own Appointments
appointments:view_incoming | View Incoming Appointments
appointments:create | Create Appointments
appointments:manage_own | Manage Own Appointments
appointments:cancel_own | Cancel Own Appointments
appointments:reschedule_own | Reschedule Own Appointments
appointments:view_calendar | View Calendar
appointments:confirm | Confirm Appointments
appointments:complete | Complete Appointments
sessions:view_own | View Own Sessions
sessions:view_history | View Session History
patients:view_own | View Own Patients
patients:view_all | View All Patients
patients:view_history | View Patient History
patients:send_notes | Send Patient Notes
patients:manage_records | Manage Patient Records
patients:view_insights | View Patient Insights
patients:export | Export Patient Data
events:create | Create Events
events:view_own | View Own Events
events:edit_own | Edit Own Events
events:delete_own | Delete Own Events
events:toggle_active | Toggle Event Active Status
availability:view_own | View Own Availability
availability:create | Create Availability
availability:edit_own | Edit Own Availability
availability:delete_own | Delete Own Availability
availability:set_limits | Set Availability Limits
calendars:connect | Connect Calendars
calendars:view_own | View Own Calendars
calendars:edit_own | Edit Own Calendars
calendars:disconnect | Disconnect Calendars
reviews:create | Create Reviews
reviews:view_own | View Own Reviews
reviews:view_about_me | View Reviews About Me
reviews:edit_own | Edit Own Reviews
reviews:delete_own | Delete Own Reviews
reviews:respond | Respond to Reviews
profile:view_own | View Own Profile
profile:edit_own | Edit Own Profile
profile:view_expert | View Expert Profile
profile:edit_expert | Edit Expert Profile
profile:preview | Preview Profile
profile:manage_link | Manage Booking Link
experts:browse | Browse Experts
experts:view_profiles | View Expert Profiles
experts:view_applications | View Expert Applications
experts:approve | Approve Expert Applications
experts:reject | Reject Expert Applications
experts:suspend | Suspend Experts
experts:verify | Verify Expert Credentials
analytics:view | View Analytics
analytics:revenue | View Revenue Analytics
analytics:patients | View Patient Analytics
analytics:performance | View Performance Analytics
analytics:export | Export Analytics
analytics:platform_growth | View Platform Growth
analytics:platform_revenue | View Platform Revenue
analytics:platform_engagement | View Platform Engagement
analytics:platform_churn | View Platform Churn
analytics:platform_export | Export Platform Analytics
branding:customize | Customize Branding
branding:upload_logo | Upload Logo
branding:custom_colors | Customize Colors
billing:view_own | View Own Billing
billing:view_earnings | View Earnings
billing:view_payouts | View Payouts
billing:view_subscription | View Subscription
billing:manage_subscription | Manage Subscription
billing:methods_manage | Manage Payment Methods
billing:manage_team_sub | Manage Team Subscription
billing:view_team_billing | View Team Billing
settings:view_own | View Own Settings
settings:edit_own | Edit Own Settings
settings:security | Manage Security Settings
settings:view_platform | View Platform Settings
settings:edit_platform | Edit Platform Settings
settings:manage_features | Manage Feature Flags
settings:manage_integrations | Manage Integrations
dashboard:view_expert | View Expert Dashboard
dashboard:view_member | View Member Dashboard
users:view_all | View All Users
users:create | Create Users
users:edit | Edit Users
users:delete | Delete Users
users:manage_roles | Manage User Roles
users:impersonate | Impersonate Users
organizations:view_all | View All Organizations
organizations:create | Create Organizations
organizations:edit | Edit Organizations
organizations:delete | Delete Organizations
organizations:manage_settings | Manage Organization Settings
payments:view_all | View All Payments
payments:view_transfers | View Payment Transfers
payments:manage_disputes | Manage Payment Disputes
payments:process_refunds | Process Refunds
payments:retry_failed | Retry Failed Payments
categories:create | Create Categories
categories:edit | Edit Categories
categories:delete | Delete Categories
categories:manage_tags | Manage Tags
moderation:view_flags | View Flagged Content
moderation:review_content | Review Flagged Content
moderation:remove_content | Remove Content
moderation:ban_users | Ban Users
audit:view_logs | View Audit Logs
audit:export_logs | Export Audit Logs
audit:view_reports | View Audit Reports
audit:generate_reports | Generate Audit Reports
support:view_tickets | View Support Tickets
support:respond_tickets | Respond to Tickets
support:escalate | Escalate Tickets
support:close_tickets | Close Tickets
team:view_dashboard | View Team Dashboard
team:view_patients | View Team Patients
team:manage_settings | Manage Team Settings
team:manage_branding | Manage Team Branding
team:view_analytics | View Team Analytics
team:export_data | Export Team Data
team:view_members | View Team Members
team:invite_members | Invite Team Members
team:remove_members | Remove Team Members
team:manage_roles | Manage Team Roles
team:view_performance | View Team Performance
schedule:manage_team | Manage Team Schedule
schedule:manage_rooms | Manage Rooms
schedule:view_capacity | View Capacity Planning
revenue:view_overview | View Revenue Overview
revenue:view_splits | View Commission Splits
revenue:manage_payouts | Manage Payouts
revenue:view_invoices | View Invoices
revenue:export_financial | Export Financial Data
```

### Member (member)

```
appointments:cancel_own
appointments:create
appointments:reschedule_own
appointments:view_own
billing:methods_manage
billing:view_own
dashboard:view_member
experts:browse
experts:view_profiles
profile:edit_own
profile:view_own
reviews:create
reviews:delete_own
reviews:edit_own
reviews:view_own
sessions:view_own
```

### Expert Community (expert_community)

```
appointments:cancel_own
appointments:complete
appointments:confirm
appointments:create
appointments:manage_own
appointments:reschedule_own
appointments:view_calendar
appointments:view_incoming
appointments:view_own
availability:create
availability:delete_own
availability:edit_own
availability:set_limits
availability:view_own
billing:manage_subscription
billing:methods_manage
billing:view_earnings
billing:view_own
billing:view_payouts
billing:view_subscription
calendars:connect
calendars:disconnect
calendars:edit_own
calendars:view_own
dashboard:view_expert
dashboard:view_member
events:create
events:delete_own
events:edit_own
events:toggle_active
events:view_own
experts:browse
experts:view_profiles
patients:send_notes
patients:view_history
patients:view_own
profile:edit_expert
profile:edit_own
profile:manage_link
profile:preview
profile:view_expert
profile:view_own
reviews:create
reviews:delete_own
reviews:edit_own
reviews:respond
reviews:view_about_me
reviews:view_own
sessions:view_own
settings:edit_own
settings:security
settings:view_own
```

### Expert Top (expert_top)

```
analytics:export
analytics:patients
analytics:performance
analytics:revenue
analytics:view
appointments:cancel_own
appointments:complete
appointments:confirm
appointments:create
appointments:manage_own
appointments:reschedule_own
appointments:view_calendar
appointments:view_incoming
appointments:view_own
availability:create
availability:delete_own
availability:edit_own
availability:set_limits
availability:view_own
billing:manage_subscription
billing:methods_manage
billing:view_earnings
billing:view_own
billing:view_payouts
billing:view_subscription
branding:custom_colors
branding:customize
branding:upload_logo
calendars:connect
calendars:disconnect
calendars:edit_own
calendars:view_own
dashboard:view_expert
dashboard:view_member
events:create
events:delete_own
events:edit_own
events:toggle_active
events:view_own
experts:browse
experts:view_profiles
patients:send_notes
patients:view_history
patients:view_own
profile:edit_expert
profile:edit_own
profile:manage_link
profile:preview
profile:view_expert
profile:view_own
reviews:create
reviews:delete_own
reviews:edit_own
reviews:respond
reviews:view_about_me
reviews:view_own
sessions:view_own
settings:edit_own
settings:security
settings:view_own
```

### Team Member (team_member)

```
appointments:cancel_own
appointments:complete
appointments:confirm
appointments:create
appointments:manage_own
appointments:reschedule_own
appointments:view_calendar
appointments:view_incoming
appointments:view_own
availability:create
availability:delete_own
availability:edit_own
availability:set_limits
availability:view_own
billing:manage_subscription
billing:methods_manage
billing:view_earnings
billing:view_own
billing:view_payouts
billing:view_subscription
calendars:connect
calendars:disconnect
calendars:edit_own
calendars:view_own
dashboard:view_expert
dashboard:view_member
events:create
events:delete_own
events:edit_own
events:toggle_active
events:view_own
experts:browse
experts:view_profiles
patients:send_notes
patients:view_history
patients:view_own
profile:edit_expert
profile:edit_own
profile:manage_link
profile:preview
profile:view_expert
profile:view_own
reviews:create
reviews:delete_own
reviews:edit_own
reviews:respond
reviews:view_about_me
reviews:view_own
sessions:view_own
settings:edit_own
settings:security
settings:view_own
team:view_dashboard
team:view_members
team:view_patients
```

### Team Admin (team_admin)

```
appointments:cancel_own
appointments:complete
appointments:confirm
appointments:create
appointments:manage_own
appointments:reschedule_own
appointments:view_calendar
appointments:view_incoming
appointments:view_own
availability:create
availability:delete_own
availability:edit_own
availability:set_limits
availability:view_own
billing:manage_subscription
billing:manage_team_sub
billing:methods_manage
billing:view_earnings
billing:view_own
billing:view_payouts
billing:view_subscription
billing:view_team_billing
calendars:connect
calendars:disconnect
calendars:edit_own
calendars:view_own
dashboard:view_expert
dashboard:view_member
events:create
events:delete_own
events:edit_own
events:toggle_active
events:view_own
experts:browse
experts:view_profiles
patients:export
patients:manage_records
patients:send_notes
patients:view_all
patients:view_history
patients:view_insights
patients:view_own
profile:edit_expert
profile:edit_own
profile:manage_link
profile:preview
profile:view_expert
profile:view_own
revenue:export_financial
revenue:manage_payouts
revenue:view_invoices
revenue:view_overview
revenue:view_splits
reviews:create
reviews:delete_own
reviews:edit_own
reviews:respond
reviews:view_about_me
reviews:view_own
schedule:manage_rooms
schedule:manage_team
schedule:view_capacity
sessions:view_own
settings:edit_own
settings:security
settings:view_own
team:export_data
team:invite_members
team:manage_branding
team:manage_roles
team:manage_settings
team:remove_members
team:view_analytics
team:view_dashboard
team:view_members
team:view_patients
team:view_performance
```

### Admin (admin)

```
analytics:export
analytics:patients
analytics:performance
analytics:platform_churn
analytics:platform_engagement
analytics:platform_export
analytics:platform_growth
analytics:platform_revenue
analytics:revenue
analytics:view
appointments:cancel_own
appointments:complete
appointments:confirm
appointments:create
appointments:manage_own
appointments:reschedule_own
appointments:view_calendar
appointments:view_incoming
appointments:view_own
audit:export_logs
audit:generate_reports
audit:view_logs
audit:view_reports
availability:create
availability:delete_own
availability:edit_own
availability:set_limits
availability:view_own
billing:manage_subscription
billing:manage_team_sub
billing:methods_manage
billing:view_earnings
billing:view_own
billing:view_payouts
billing:view_subscription
billing:view_team_billing
branding:custom_colors
branding:customize
branding:upload_logo
calendars:connect
calendars:disconnect
calendars:edit_own
calendars:view_own
categories:create
categories:delete
categories:edit
categories:manage_tags
dashboard:view_expert
dashboard:view_member
events:create
events:delete_own
events:edit_own
events:toggle_active
events:view_own
experts:approve
experts:browse
experts:reject
experts:suspend
experts:verify
experts:view_applications
experts:view_profiles
moderation:ban_users
moderation:remove_content
moderation:review_content
moderation:view_flags
organizations:create
organizations:delete
organizations:edit
organizations:manage_settings
organizations:view_all
patients:export
patients:manage_records
patients:send_notes
patients:view_all
patients:view_history
patients:view_insights
patients:view_own
payments:manage_disputes
payments:process_refunds
payments:retry_failed
payments:view_all
payments:view_transfers
profile:edit_expert
profile:edit_own
profile:manage_link
profile:preview
profile:view_expert
profile:view_own
revenue:export_financial
revenue:manage_payouts
revenue:view_invoices
revenue:view_overview
revenue:view_splits
reviews:create
reviews:delete_own
reviews:edit_own
reviews:respond
reviews:view_about_me
reviews:view_own
schedule:manage_rooms
schedule:manage_team
schedule:view_capacity
sessions:view_history
sessions:view_own
settings:edit_own
settings:edit_platform
settings:manage_features
settings:manage_integrations
settings:security
settings:view_own
settings:view_platform
support:close_tickets
support:escalate
support:respond_tickets
support:view_tickets
team:export_data
team:invite_members
team:manage_branding
team:manage_roles
team:manage_settings
team:remove_members
team:view_analytics
team:view_dashboard
team:view_members
team:view_patients
team:view_performance
users:create
users:delete
users:edit
users:impersonate
users:manage_roles
users:view_all
```
