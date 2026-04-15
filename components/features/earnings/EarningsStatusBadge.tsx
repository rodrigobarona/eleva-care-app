import { Badge } from '@/components/ui/badge';
import type { EarningsStatusGroup } from '@/server/earnings';

const badgeStyles: Record<EarningsStatusGroup, string> = {
  scheduled: 'bg-amber-50 text-amber-700',
  available: 'bg-blue-50 text-blue-700',
  paid_out: 'bg-green-50 text-green-700',
  refunded: 'bg-slate-100 text-slate-700',
  issue: 'bg-red-50 text-red-700',
  sale: 'bg-violet-50 text-violet-700',
};

type EarningsStatusBadgeProps = {
  statusGroup: EarningsStatusGroup;
  label: string;
};

export function EarningsStatusBadge({ statusGroup, label }: EarningsStatusBadgeProps) {
  return (
    <Badge variant="outline" className={badgeStyles[statusGroup]}>
      {label}
    </Badge>
  );
}
