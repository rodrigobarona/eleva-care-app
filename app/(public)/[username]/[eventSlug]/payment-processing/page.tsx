'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Icons } from '@/components/atoms/icons';
import { useRouter } from 'next/navigation';
import { Suspense, use, useEffect, useState } from 'react';

const MAX_ATTEMPTS = 15;
const CHECK_INTERVAL = 2000;

function PaymentProcessingContent(props: {
  params: Promise<{ username: string; eventSlug: string }>;
  searchParams: Promise<{ startTime: string }>;
}) {
  const searchParams = use(props.searchParams);

  const { startTime } = searchParams;

  const params = use(props.params);

  const { username, eventSlug } = params;

  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const checkMeetingStatus = async () => {
      try {
        const response = await fetch(
          `/api/meetings/status?startTime=${startTime}&eventSlug=${eventSlug}`,
        );
        const data = await response.json();

        if (data.status === 'created') {
          router.push(`/${username}/${eventSlug}/success?startTime=${startTime}`);
        } else if (attempts >= MAX_ATTEMPTS) {
          router.push(`/${username}/${eventSlug}?error=payment-timeout`);
        } else {
          setAttempts((prev) => prev + 1);
        }
      } catch (error) {
        console.error('Error checking meeting status:', error);
      }
    };

    const timer = setTimeout(checkMeetingStatus, CHECK_INTERVAL);
    return () => clearTimeout(timer);
  }, [attempts, eventSlug, router, startTime, username]);

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Processing Your Payment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-8">
        <Icons.spinner className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-4">Please wait while we confirm your payment...</p>
      </CardContent>
    </Card>
  );
}

export default function PaymentProcessingPage(props: {
  params: Promise<{ username: string; eventSlug: string }>;
  searchParams: Promise<{ startTime: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading payment status...</div>}>
      <PaymentProcessingContent {...props} />
    </Suspense>
  );
}
