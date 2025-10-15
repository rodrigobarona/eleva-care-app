'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Link } from '@/lib/i18n/navigation';
import { AlertTriangle, BadgeCheck, Clock, Fingerprint, Info, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { Suspense } from 'react';
import { toast } from 'sonner';

interface IdentityPageClientProps {
  dbUser: {
    id: string;
    stripeIdentityVerificationId: string | null;
  };
  verificationStatus: {
    status: 'unverified' | 'pending' | 'verified' | 'rejected';
    lastUpdated: string | null;
    details?: string;
  } | null;
}

function IdentityPageContent({ verificationStatus }: IdentityPageClientProps) {
  const t = useTranslations('account.identity');
  const [isStartingVerification, setIsStartingVerification] = React.useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false);

  // Rebuild KV data when component mounts
  React.useEffect(() => {
    const rebuildKVData = async () => {
      try {
        console.log('Rebuilding KV data on identity page load');

        const response = await fetch('/api/user/rebuild-kv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to rebuild KV data:', error);
        } else {
          console.log('KV data rebuilt successfully');
        }
      } catch (error) {
        console.error('Error rebuilding KV data:', error);
      }
    };

    rebuildKVData();
  }, []);

  const handleStartVerification = async () => {
    try {
      setIsStartingVerification(true);
      const response = await fetch('/api/stripe/identity/start-verification', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        // For external Stripe URLs, we need to use window.location
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to start identity verification:', error);
      toast.error('Failed to start identity verification. Please try again.');
    } finally {
      setIsStartingVerification(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const response = await fetch('/api/stripe/identity/check-status', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Verification status updated successfully');

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Failed to check verification status:', error);
      toast.error('Failed to check status. Please try again.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const renderStatusBadge = () => {
    if (!verificationStatus) return null;

    switch (verificationStatus.status) {
      case 'verified':
        return (
          <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
            <BadgeCheck className="h-4 w-4" />
            <span>{t('status.verified')}</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
            <Clock className="h-4 w-4" />
            <span>{t('status.pending')}</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span>{t('status.rejected')}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-sm text-gray-700">
            <Fingerprint className="h-4 w-4" />
            <span>{t('status.unverified')}</span>
          </div>
        );
    }
  };

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('subtitle')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            {renderStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Privacy & Data Processing Notice */}
          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Privacy & Data Protection</AlertTitle>
            <AlertDescription className="space-y-2 text-blue-800">
              <p>
                {t('privacyNotice')}{' '}
                <Link href="/legal/privacy" className="font-medium underline hover:text-blue-900">
                  {t('privacyPolicy')}
                </Link>{' '}
                and{' '}
                <Link href="/legal/dpa" className="font-medium underline hover:text-blue-900">
                  {t('dataProcessing')}
                </Link>
                .
              </p>
              <p className="text-sm">{t('securityInfo')}</p>
            </AlertDescription>
          </Alert>

          {/* Data Usage Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How We Use Your Identity Data</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{t('dataUsage')}</p>
              <ul className="ml-4 list-disc space-y-1 text-sm">
                <li>{t('dataUsageItems.fraud')}</li>
                <li>{t('dataUsageItems.compliance')}</li>
                <li>{t('dataUsageItems.trust')}</li>
                <li>{t('dataUsageItems.payments')}</li>
              </ul>
            </AlertDescription>
          </Alert>
          {!verificationStatus || verificationStatus.status === 'unverified' ? (
            <div>
              <p className="mb-4">
                Please complete identity verification to ensure security and compliance. This is a
                quick process that requires a government-issued photo ID and a selfie.
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                We use a specialized verification flow that ensures a smooth and secure verification
                process.
              </p>
              <Button onClick={handleStartVerification} disabled={isStartingVerification}>
                {isStartingVerification ? t('buttons.starting') : t('buttons.start')}
              </Button>
            </div>
          ) : verificationStatus.status === 'pending' ? (
            <div>
              <p className="mb-4">
                Your identity verification is currently under review. This process typically takes
                1-2 business days. You&apos;ll be notified once the review is complete.
              </p>
              <div className="flex gap-4">
                <Button onClick={handleCheckStatus} disabled={isCheckingStatus} variant="outline">
                  {isCheckingStatus ? t('buttons.checking') : t('buttons.checkStatus')}
                </Button>
                <Button onClick={handleStartVerification} disabled={isStartingVerification}>
                  {isStartingVerification ? t('buttons.starting') : t('buttons.resume')}
                </Button>
              </div>
              {verificationStatus.lastUpdated && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Last updated: {new Date(verificationStatus.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          ) : verificationStatus.status === 'verified' ? (
            <div>
              <p className="mb-4 text-green-700">
                Your identity has been successfully verified. Thank you for completing this
                important security step.
              </p>
              {verificationStatus.lastUpdated && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Verified on: {new Date(verificationStatus.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-4 text-red-700">
                Your verification was not successful.{' '}
                {verificationStatus.details || 'Please try again.'}
              </p>
              <Button onClick={handleStartVerification} disabled={isStartingVerification}>
                {isStartingVerification ? t('buttons.starting') : t('buttons.tryAgain')}
              </Button>
              {verificationStatus.lastUpdated && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Last attempted: {new Date(verificationStatus.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function IdentityPageClient(props: IdentityPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="container flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Loading identity verification...</p>
        </div>
      }
    >
      <IdentityPageContent {...props} />
    </Suspense>
  );
}
