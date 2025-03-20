'use client';

import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function IdentityCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Checking verification status...');

  useEffect(() => {
    async function checkVerificationStatus() {
      try {
        const response = await fetch('/api/stripe/identity/status');
        const data = await response.json();

        if (data.verified) {
          toast.success('Identity Verified', {
            description: 'Your identity has been successfully verified!',
          });

          // Create a custom event to notify the application that identity is verified
          const event = new CustomEvent('identity-verification-completed', {
            detail: { verified: true },
          });
          window.dispatchEvent(event);

          // Redirect to success page
          router.push('/account/identity/success');
        } else if (data.status === 'requires_input') {
          setMessage('Your verification requires additional information.');
          toast.warning('Action Required', {
            description: 'Your verification needs additional information.',
          });

          // Redirect back to identity page after a delay
          setTimeout(() => {
            router.push('/account/identity');
          }, 3000);
        } else {
          setMessage(`Verification status: ${data.status}`);
          // Redirect back to identity page after a delay
          setTimeout(() => {
            router.push('/account/identity');
          }, 3000);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        setMessage('Failed to check verification status.');

        // Redirect back to identity page after a delay
        setTimeout(() => {
          router.push('/account/identity');
        }, 3000);
      }
    }

    checkVerificationStatus();
  }, [router]);

  return (
    <div className="container flex h-[50vh] flex-col items-center justify-center">
      <LoadingSpinner />
      <h1 className="mb-2 text-xl font-semibold">{message}</h1>
      <p className="text-muted-foreground">You will be redirected shortly...</p>
    </div>
  );
}
