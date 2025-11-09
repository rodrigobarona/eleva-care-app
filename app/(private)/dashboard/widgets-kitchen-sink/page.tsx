/**
 * WorkOS Widgets Kitchen Sink
 *
 * This page showcases all available WorkOS widgets for testing and evaluation.
 * Each widget is displayed with:
 * - Description of its purpose
 * - Required permissions/scopes
 * - Use case recommendations
 * - Live implementation
 *
 * @see https://workos.com/docs/widgets/quick-start
 */
import { workos } from '@/lib/integrations/workos/client';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

import { WidgetShowcase } from './WidgetShowcase';

// Generate widget tokens with error handling
async function generateWidgetTokens(userId: string, organizationId: string) {
  try {
    const [
      userManagementToken,
      userProfileToken,
      userSecurityToken,
      userSessionsToken,
      userApiKeysToken,
      domainVerificationToken,
      ssoConnectionToken,
    ] = await Promise.all([
      // 1. User Management Widget Token
      workos.widgets.getToken({
        userId,
        organizationId,
        scopes: ['widgets:users-table:manage'],
      }),
      // 2. User Profile Widget Token
      workos.widgets.getToken({
        userId,
        organizationId,
        scopes: ['widgets:users-table:read'],
      }),
      // 3. User Security Widget Token
      workos.widgets.getToken({
        userId,
        organizationId,
        scopes: ['widgets:users-table:read'],
      }),
      // 4. User Sessions Widget Token
      workos.widgets.getToken({
        userId,
        organizationId,
        scopes: ['widgets:users-table:read'],
      }),
      // 5. User API Keys Widget Token
      workos.widgets.getToken({
        userId,
        organizationId,
        scopes: ['widgets:users-table:read'],
      }),
      // 6. Admin Portal - Domain Verification Widget Token
      workos.widgets.getToken({
        userId,
        organizationId,
        scopes: ['widgets:domain-verification:manage'],
      }),
      // 7. Admin Portal - SSO Connection Widget Token
      workos.widgets.getToken({
        userId,
        organizationId,
        scopes: ['widgets:sso:manage'],
      }),
    ]);

    return {
      userManagementToken,
      userProfileToken,
      userSecurityToken,
      userSessionsToken,
      userApiKeysToken,
      domainVerificationToken,
      ssoConnectionToken,
    };
  } catch (error) {
    console.error('Error generating widget tokens:', error);
    return null;
  }
}

export default async function WidgetsKitchenSinkPage() {
  // Ensure user is authenticated
  const { user, organizationId, sessionId } = await withAuth({ ensureSignedIn: true });

  if (!user || !organizationId) {
    redirect('/login');
  }

  // Generate widget tokens for all available widgets
  const tokens = await generateWidgetTokens(user.id, organizationId);

  // Handle token generation errors
  if (!tokens) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Error Loading Widgets</h2>
          <p className="text-sm">
            Failed to generate widget tokens. Please check your WorkOS configuration and ensure the
            user has the necessary permissions.
          </p>
        </div>
      </div>
    );
  }

  const {
    userManagementToken,
    userProfileToken,
    userSecurityToken,
    userSessionsToken,
    userApiKeysToken,
    domainVerificationToken,
    ssoConnectionToken,
  } = tokens;

  // Widget definitions for the kitchen sink
  const widgets = [
    {
      id: 'user-management',
      name: 'User Management',
      description:
        'Allows organization admins to manage users, invite new members, remove existing ones, and modify roles. Essential for team management.',
      category: 'User Management',
      token: userManagementToken.token,
      scopes: ['widgets:users-table:manage'],
      useCases: [
        'Organization admin dashboard',
        'Team management pages',
        'User provisioning workflows',
      ],
      permissions: 'Requires organization admin role',
      component: 'UsersManagement',
    },
    {
      id: 'user-profile',
      name: 'User Profile',
      description:
        'Displays and allows editing of user profile details including name, email, and other personal information.',
      category: 'User Management',
      token: userProfileToken.token,
      scopes: ['widgets:users-table:read'],
      useCases: ['User settings page', 'Profile management', 'Account details'],
      permissions: 'Any authenticated user',
      component: 'UserProfile',
    },
    {
      id: 'user-security',
      name: 'User Security',
      description:
        'Allows users to manage passwords and MFA (Multi-Factor Authentication) settings. Essential for security-conscious applications.',
      category: 'Security',
      token: userSecurityToken.token,
      scopes: ['widgets:users-table:read'],
      useCases: ['Security settings page', 'Password management', 'MFA setup'],
      permissions: 'Any authenticated user',
      component: 'UserSecurity',
    },
    {
      id: 'user-sessions',
      name: 'User Sessions',
      description:
        'Displays active user sessions across devices. Users can view and revoke sessions for security purposes.',
      category: 'Security',
      token: userSessionsToken.token,
      scopes: ['widgets:users-table:read'],
      useCases: ['Security dashboard', 'Session management', 'Device tracking'],
      permissions: 'Any authenticated user',
      sessionId, // Pass current session ID
      component: 'UserSessions',
    },
    {
      id: 'user-api-keys',
      name: 'User API Keys',
      description:
        'Allows users to generate and manage API keys for programmatic access to your application.',
      category: 'Developer Tools',
      token: userApiKeysToken.token,
      scopes: ['widgets:users-table:read'],
      useCases: ['Developer settings', 'API key management', 'Integration setup'],
      permissions: 'Any authenticated user',
      component: 'ApiKeys',
    },
    {
      id: 'domain-verification',
      name: 'Domain Verification',
      description:
        'Allows users with necessary permissions to verify domains in the Admin Portal. Required for SSO setup.',
      category: 'Admin Portal',
      token: domainVerificationToken.token,
      scopes: ['widgets:domain-verification:manage'],
      useCases: ['SSO setup workflow', 'Domain verification', 'Organization setup'],
      permissions: 'Requires widgets:domain-verification:manage permission',
      component: 'AdminPortalDomainVerification',
    },
    {
      id: 'sso-connection',
      name: 'SSO Connection',
      description:
        'Enables configuration and management of Single Sign-On (SSO) connections for an organization.',
      category: 'Admin Portal',
      token: ssoConnectionToken.token,
      scopes: ['widgets:sso:manage'],
      useCases: ['Enterprise SSO setup', 'SAML configuration', 'Organization authentication'],
      permissions: 'Requires widgets:sso:manage permission',
      component: 'AdminPortalSsoConnection',
    },
  ];

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">WorkOS Widgets Kitchen Sink</h1>
        <p className="text-muted-foreground">
          Explore all available WorkOS widgets and their use cases. This page is for development and
          testing purposes.
        </p>
      </div>

      {/* User Info */}
      <div className="mb-8 rounded-lg border bg-muted p-4">
        <h2 className="mb-2 text-lg font-semibold">Current User Context</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="font-medium">User ID:</span> <code className="ml-1">{user.id}</code>
          </div>
          <div>
            <span className="font-medium">Email:</span> <code className="ml-1">{user.email}</code>
          </div>
          <div>
            <span className="font-medium">Organization ID:</span>{' '}
            <code className="ml-1">{organizationId}</code>
          </div>
        </div>
      </div>

      {/* Widget Showcase */}
      <WidgetShowcase widgets={widgets} />
    </div>
  );
}
