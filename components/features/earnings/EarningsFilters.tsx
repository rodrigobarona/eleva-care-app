'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const MONTHS = [
  { label: 'All months', value: 'all' },
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

type EarningsFiltersProps = {
  selectedYear: number;
  selectedMonth: number | null;
  availableYears: number[];
};

export function EarningsFilters({
  selectedYear,
  selectedMonth,
  availableYears,
}: EarningsFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (key: 'year' | 'month', value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (key === 'month' && value === 'all') {
      nextParams.delete('month');
    } else {
      nextParams.set(key, value);
    }

    startTransition(() => {
      router.push(`${pathname}?${nextParams.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => updateFilters('year', value)}
      >
        <SelectTrigger
          className="h-8 w-[100px] text-xs"
          aria-label="Select earnings year"
          disabled={isPending}
        >
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedMonth?.toString() ?? 'all'}
        onValueChange={(value) => updateFilters('month', value)}
      >
        <SelectTrigger
          className="h-8 w-[130px] text-xs"
          aria-label="Select earnings month"
          disabled={isPending}
        >
          <SelectValue placeholder="All months" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
