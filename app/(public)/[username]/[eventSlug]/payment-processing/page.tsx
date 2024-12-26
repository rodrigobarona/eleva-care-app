"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Icons } from "@/components/atoms/icons";

export default function PaymentProcessingPage({
  params: { username, eventSlug },
  searchParams: { startTime },
}: {
  params: { username: string; eventSlug: string };
  searchParams: { startTime: string };
}) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  useEffect(() => {
    const checkMeetingStatus = async () => {
      try {
        const response = await fetch(
          `/api/meetings/status?startTime=${startTime}&eventSlug=${eventSlug}`
        );
        const data = await response.json();

        if (data.status === "created") {
          router.push(
            `/${username}/${eventSlug}/success?startTime=${startTime}`
          );
        } else if (attempts >= maxAttempts) {
          router.push(`/${username}/${eventSlug}?error=payment-timeout`);
        } else {
          setAttempts((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Error checking meeting status:", error);
      }
    };

    const timer = setTimeout(checkMeetingStatus, 2000);
    return () => clearTimeout(timer);
  }, [attempts, eventSlug, router, startTime, username]);

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Processing Your Payment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-8">
        <Icons.spinner className="h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">
          Please wait while we confirm your payment...
        </p>
      </CardContent>
    </Card>
  );
}
