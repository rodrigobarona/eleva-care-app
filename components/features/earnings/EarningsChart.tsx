'use client';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { EarningsMonthlySeriesItem } from '@/server/earnings';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
  sessionNetAmount: {
    label: 'Sessions',
    color: 'var(--eleva-primary)',
  },
  packNetAmount: {
    label: 'Packs',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

type EarningsChartProps = {
  data: EarningsMonthlySeriesItem[];
  currency: string;
};

export function EarningsChart({ data, currency }: EarningsChartProps) {
  const hasData = data.some((item) => item.netAmount > 0);

  if (!hasData) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No earnings recorded for this year yet.
      </div>
    );
  }

  const currencySymbol = currency === 'EUR' ? '€' : currency;

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(value: number) =>
            value >= 100 ? `${currencySymbol}${Math.round(value / 100)}` : ''
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `${label} ${new Date().getFullYear()}`}
              formatter={(value, name) => {
                const amount = Number(value) / 100;
                const label = name === 'sessionNetAmount' ? 'Sessions' : 'Packs';
                return [`${currencySymbol}${amount.toFixed(2)}`, label];
              }}
            />
          }
        />
        <Bar
          dataKey="sessionNetAmount"
          stackId="earnings"
          fill="var(--color-sessionNetAmount)"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="packNetAmount"
          stackId="earnings"
          fill="var(--color-packNetAmount)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
