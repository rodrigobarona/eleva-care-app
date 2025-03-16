'use client';

import { Button } from '@/components/atoms/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="container flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>You don&apos;t have permission to access this resource.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            This area requires higher privileges than what your account currently has. Please
            contact an administrator if you believe you should have access.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button 
            variant="default" 
            onClick={() => router.push(`/${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}`)}
          >
            Go Home
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
