'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Button } from '@/components/atoms/button';
import {
  useIsAdmin,
  useIsCommunityExpert,
  useIsExpert,
  useIsTopExpert,
} from '@/components/molecules/AuthorizationProvider';
import { AlertTriangle, Shield, User, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ExampleProtectedComponent() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isExpert = useIsExpert();
  const isTopExpert = useIsTopExpert();
  const isCommunityExpert = useIsCommunityExpert();

  if (isAdmin) {
    return (
      <Alert className="bg-blue-50">
        <Shield className="h-4 w-4" />
        <AlertTitle>Admin Access</AlertTitle>
        <AlertDescription>
          You have administrator access. You can view and manage all system data.
        </AlertDescription>
        <Button className="mt-2" onClick={() => router.push('/admin/users')}>
          Go to Admin Panel
        </Button>
      </Alert>
    );
  }

  if (isTopExpert) {
    return (
      <Alert className="bg-green-50">
        <UserCheck className="h-4 w-4" />
        <AlertTitle>Top Expert</AlertTitle>
        <AlertDescription>
          You are a top expert. You have access to premium features.
        </AlertDescription>
        <Button className="mt-2" onClick={() => router.push('/expert/dashboard')}>
          View Expert Dashboard
        </Button>
      </Alert>
    );
  }

  if (isCommunityExpert) {
    return (
      <Alert className="bg-yellow-50">
        <User className="h-4 w-4" />
        <AlertTitle>Community Expert</AlertTitle>
        <AlertDescription>
          You are a community expert. You can offer sessions to clients.
        </AlertDescription>
        <Button className="mt-2" onClick={() => router.push('/expert/dashboard')}>
          View Expert Dashboard
        </Button>
      </Alert>
    );
  }

  return (
    <Alert className="bg-gray-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Regular User</AlertTitle>
      <AlertDescription>
        You do not have expert or admin privileges. Some features might be restricted.
      </AlertDescription>
    </Alert>
  );
}
