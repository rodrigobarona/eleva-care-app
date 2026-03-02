import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { db } from '@/drizzle/db';
import { PackPurchaseTable, SessionPackTable } from '@/drizzle/schema';
import { desc, eq } from 'drizzle-orm';
import { Package, Search } from 'lucide-react';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  en: {
    active: 'Active',
    fully_redeemed: 'Fully Used',
    expired: 'Expired',
    cancelled: 'Cancelled',
  },
  pt: {
    active: 'Ativo',
    fully_redeemed: 'Totalmente Usado',
    expired: 'Expirado',
    cancelled: 'Cancelado',
  },
  es: {
    active: 'Activo',
    fully_redeemed: 'Totalmente Usado',
    expired: 'Expirado',
    cancelled: 'Cancelado',
  },
};

export default async function MyPacksPage(props: PageProps) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  const email =
    typeof searchParams.email === 'string' ? searchParams.email.trim().toLowerCase() : '';

  if (!email) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-16">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">My Session Packs</CardTitle>
            <CardDescription>
              Enter your email to view your purchased session packs and remaining sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="flex gap-2">
                <Input
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="flex-1"
                />
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  Look up
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const purchases = await db
    .select({
      id: PackPurchaseTable.id,
      promotionCode: PackPurchaseTable.promotionCode,
      maxRedemptions: PackPurchaseTable.maxRedemptions,
      redemptionsUsed: PackPurchaseTable.redemptionsUsed,
      status: PackPurchaseTable.status,
      expiresAt: PackPurchaseTable.expiresAt,
      createdAt: PackPurchaseTable.createdAt,
      packName: SessionPackTable.name,
      packDescription: SessionPackTable.description,
    })
    .from(PackPurchaseTable)
    .innerJoin(SessionPackTable, eq(PackPurchaseTable.packId, SessionPackTable.id))
    .where(eq(PackPurchaseTable.buyerEmail, email))
    .orderBy(desc(PackPurchaseTable.createdAt));

  const statusLabels = STATUS_LABELS[locale.split('-')[0]] || STATUS_LABELS.en;

  return (
    <div className="container max-w-2xl py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">My Session Packs</h1>
        <p className="mt-2 text-muted-foreground">
          Showing packs for <strong>{email}</strong>
        </p>
        <form className="mt-4 flex justify-center gap-2">
          <Input
            name="email"
            type="email"
            defaultValue={email}
            placeholder="your@email.com"
            className="max-w-xs"
          />
          <Button type="submit" variant="outline" size="sm">
            Change
          </Button>
        </form>
      </div>

      {purchases.length > 0 ? (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const remaining = purchase.maxRedemptions - purchase.redemptionsUsed;
            const progressPercent =
              purchase.maxRedemptions > 0
                ? (purchase.redemptionsUsed / purchase.maxRedemptions) * 100
                : 0;
            const isExpired = purchase.expiresAt && new Date(purchase.expiresAt) < new Date();
            const displayStatus =
              isExpired && purchase.status === 'active' ? 'expired' : purchase.status;

            return (
              <Card key={purchase.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{purchase.packName}</CardTitle>
                        {purchase.packDescription && (
                          <CardDescription className="mt-1">
                            {purchase.packDescription}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        displayStatus === 'active'
                          ? 'default'
                          : displayStatus === 'fully_redeemed'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {statusLabels[displayStatus] || displayStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sessions used</span>
                      <span className="font-medium">
                        {purchase.redemptionsUsed} / {purchase.maxRedemptions}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    {remaining > 0 && displayStatus === 'active' && (
                      <p className="text-sm font-medium text-green-600">
                        {remaining} session{remaining !== 1 ? 's' : ''} remaining
                      </p>
                    )}
                  </div>

                  {displayStatus === 'active' && remaining > 0 && (
                    <div className="rounded-lg border bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Your promo code:</p>
                      <p className="mt-1 font-mono text-lg font-bold tracking-wider text-primary">
                        {purchase.promotionCode}
                      </p>
                      {purchase.expiresAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Valid until{' '}
                          {new Date(purchase.expiresAt).toLocaleDateString(
                            locale === 'pt' ? 'pt-PT' : locale === 'es' ? 'es-ES' : 'en-US',
                            { month: 'long', day: 'numeric', year: 'numeric' },
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Purchased{' '}
                    {new Date(purchase.createdAt).toLocaleDateString(
                      locale === 'pt' ? 'pt-PT' : locale === 'es' ? 'es-ES' : 'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center">
          <CardContent className="pb-8 pt-8">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No packs found</h3>
            <p className="text-muted-foreground">
              No session packs were found for this email address.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
