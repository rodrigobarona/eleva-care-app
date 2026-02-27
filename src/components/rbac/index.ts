/**
 * RBAC Components
 *
 * Exports for role and permission-based conditional rendering components.
 */

// Permission-based components
export {
  RequireAllPermissions,
  RequireAnalytics,
  RequireAnyPermission,
  RequireBranding,
  RequireExpertApproval,
  RequirePermission,
  RequireTeamAdmin,
  RequireTeamDashboard,
  RequireUserManagement,
} from './RequirePermission';

// Role-based components
export {
  NonExpert,
  NonTopExpert,
  NotRole,
  RequireAdmin,
  RequireCommunityExpert,
  RequireExpert,
  RequireMember,
  RequireRole,
  RequireTeamAdmin as RequireTeamAdminRole,
  RequireTeamMember,
  RequireTopExpert,
} from './RequireRole';

