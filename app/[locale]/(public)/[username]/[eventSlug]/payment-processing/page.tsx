'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Icons } from '@/components/atoms/icons';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const MAX_ATTEMPTS = 15;
const CHECK_INTERVAL = 2000;

function PaymentProcessingContent(props: {
  params: Promise<{ username: string; eventSlug: string; locale: string }>;
  searchParams: Promise<{ startTime: string }>;
}) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [resolvedParams, setResolvedParams] = useState<{
    username?: string;
    eventSlug?: string;
    locale?: string;
    startTime?: string;
  }>({});

  // Resolve promises when component mounts
  useEffect(() => {
    const resolveProps = async () => {
      try {
        const [paramsData, searchParamsData] = await Promise.all([
          props.params,
          props.searchParams,
        ]);
        setResolvedParams({
          ...paramsData,
          startTime: searchParamsData.startTime,
        });
      } catch (error) {
        console.error('Error resolving props:', error);
      }
    };

    resolveProps();
  }, [props.params, props.searchParams]);

  // Only start checking meeting status once we have all params resolved
  useEffect(() => {
    if (!resolvedParams.startTime || !resolvedParams.eventSlug) return;

    const checkMeetingStatus = async () => {
      try {
        const response = await fetch(
          `/api/meetings/status?startTime=${resolvedParams.startTime}&eventSlug=${resolvedParams.eventSlug}`,
        );
        const data = await response.json();

        if (data.status === 'created') {
          router.push(
            `/${resolvedParams.locale}/${resolvedParams.username}/${resolvedParams.eventSlug}/success?startTime=${resolvedParams.startTime}`,
          );
        } else if (attempts >= MAX_ATTEMPTS) {
          router.push(
            `/${resolvedParams.locale}/${resolvedParams.username}/${resolvedParams.eventSlug}?error=payment-timeout`,
          );
        } else {
          setAttempts((prev) => prev + 1);
        }
      } catch (error) {
        console.error('Error checking meeting status:', error);
      }
    };

    const timer = setTimeout(checkMeetingStatus, CHECK_INTERVAL);
    return () => clearTimeout(timer);
  }, [attempts, router, resolvedParams]);

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Processing Your Payment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-8">
        <Icons.spinner className="h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Please wait while we confirm your payment...</p>
      </CardContent>
    </Card>
  );
}

interface PageProps {
  params: Promise<{
    username: string;
    eventSlug: string;
    locale: string;
  }>;
  searchParams: Promise<{
    startTime: string;
  }>;
}

export default function PaymentProcessingPage(props: PageProps) {
  return (
    <Suspense fallback={<div>Loading payment status...</div>}>
      <PaymentProcessingContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
