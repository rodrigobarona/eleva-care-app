import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function PackPurchaseSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SessionPacks.success' });

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription className="text-base">{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{t('emailNotice')}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">{t('nextSteps')}</h3>
            <ol className="space-y-2 text-left text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                {t('step1')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                {t('step2')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                {t('step3')}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">4.</span>
                {t('step4')}
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={`/${locale}/my-packs`}>View My Packs</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/${locale}`}>{t('browseExperts')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
