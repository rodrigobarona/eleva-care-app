import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';
import { Package, ShoppingBag } from 'lucide-react';

type Purchase = {
  id: string;
  buyerEmail: string;
  buyerName: string | null;
  promotionCode: string;
  maxRedemptions: number;
  redemptionsUsed: number;
  status: 'active' | 'fully_redeemed' | 'expired' | 'cancelled';
  expiresAt: Date | null;
  createdAt: Date;
  currency: string;
  grossAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  packName: string;
  packSessionsCount: number;
};

interface PackPurchasesViewProps {
  purchases: Purchase[];
}

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const },
  fully_redeemed: { label: 'Fully Used', variant: 'secondary' as const },
  expired: { label: 'Expired', variant: 'destructive' as const },
  cancelled: { label: 'Cancelled', variant: 'outline' as const },
};

export function PackPurchasesView({ purchases }: PackPurchasesViewProps) {
  return (
    <div className="container space-y-6 py-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Pack Purchases</h1>
        <p className="text-muted-foreground">
          Track all pack purchases made by your customers, their revenue, and redemption progress.
        </p>
      </div>

      {purchases.length > 0 ? (
        <div className="grid gap-4">
          {purchases.map((purchase) => {
            const remaining = purchase.maxRedemptions - purchase.redemptionsUsed;
            const progressPercent =
              purchase.maxRedemptions > 0
                ? (purchase.redemptionsUsed / purchase.maxRedemptions) * 100
                : 0;
            const statusConfig = STATUS_CONFIG[purchase.status];
            const isExpired = purchase.expiresAt && new Date(purchase.expiresAt) < new Date();
            const displayStatus =
              isExpired && purchase.status === 'active' ? 'expired' : purchase.status;

            return (
              <Card key={purchase.id} className={cn(displayStatus !== 'active' && 'opacity-75')}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{purchase.packName}</CardTitle>
                        <CardDescription>
                          {purchase.buyerName || purchase.buyerEmail}
                          {purchase.buyerName && (
                            <span className="ml-1 text-xs">({purchase.buyerEmail})</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={STATUS_CONFIG[displayStatus]?.variant || statusConfig.variant}>
                      {STATUS_CONFIG[displayStatus]?.label || statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Client paid</p>
                      <p className="font-medium">
                        {formatCurrency(purchase.grossAmount, purchase.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">You earn</p>
                      <p className="font-medium">
                        {formatCurrency(purchase.netAmount, purchase.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Platform fee</p>
                      <p className="font-medium">
                        {formatCurrency(purchase.platformFeeAmount, purchase.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sessions used</span>
                      <span className="font-medium">
                        {purchase.redemptionsUsed} / {purchase.maxRedemptions}
                        {remaining > 0 && (
                          <span className="ml-1 text-muted-foreground">
                            ({remaining} remaining)
                          </span>
                        )}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Purchased:{' '}
                      {new Date(purchase.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {purchase.expiresAt && (
                      <span>
                        Expires:{' '}
                        {new Date(purchase.expiresAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    <span className="font-mono text-xs">Code: {purchase.promotionCode}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No purchases yet</h3>
          <p className="text-muted-foreground">
            When customers purchase your session packs, their purchases and redemption progress will
            appear here.
          </p>
        </Card>
      )}
    </div>
  );
}
