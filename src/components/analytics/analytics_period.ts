'use client';

import { useMemo, useState } from 'react';
import { endOfDay, startOfDay, subMonths, subWeeks } from 'date-fns';

export type AnalyticsPeriodType =
  | 'all_time'
  | 'last_week'
  | 'last_month'
  | 'last_3_months'
  | 'custom';

export const ANALYTICS_PERIOD_ITEMS = [
  { label: 'All Time', value: 'all_time' as const },
  { label: 'Last Week', value: 'last_week' as const },
  { label: 'Last Month', value: 'last_month' as const },
  { label: 'Last 3 Months', value: 'last_3_months' as const },
  { label: 'Custom Range', value: 'custom' as const }
] as const;

export type AnalyticsDateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export type AnalyticsResolvedRange = { from: Date; to: Date } | null;

export function defaultAnalyticsDateRange(): AnalyticsDateRange {
  const today = endOfDay(new Date());
  return { from: startOfDay(subMonths(today, 1)), to: today };
}

export function resolveAnalyticsPeriodRange(
  period: AnalyticsPeriodType,
  dateRange: AnalyticsDateRange
): AnalyticsResolvedRange {
  if (period === 'all_time') return null;

  const today = endOfDay(new Date());
  if (period === 'last_week') return { from: startOfDay(subWeeks(today, 1)), to: today };
  if (period === 'last_month') return { from: startOfDay(subMonths(today, 1)), to: today };
  if (period === 'last_3_months') return { from: startOfDay(subMonths(today, 3)), to: today };

  return dateRange.from && dateRange.to
    ? { from: startOfDay(dateRange.from), to: endOfDay(dateRange.to) }
    : null;
}

/** Custom range needs both ends picked before a query can run. */
export function analyticsRangeEnabled(allTime: boolean, range: AnalyticsResolvedRange): boolean {
  return allTime || !!(range?.from && range?.to);
}

export type AnalyticsPeriodState = {
  period: AnalyticsPeriodType;
  setPeriod: (period: AnalyticsPeriodType) => void;
  dateRange: AnalyticsDateRange;
  setDateRange: (range: AnalyticsDateRange) => void;
  allTime: boolean;
  /** Null while `all_time`; the concrete window otherwise. */
  effectiveRange: AnalyticsResolvedRange;
  /** False until the chosen range can be queried. */
  isReady: boolean;
};

/** Shared period + custom range state for every analytics surface. */
export function useAnalyticsPeriod(
  initialPeriod: AnalyticsPeriodType = 'last_month'
): AnalyticsPeriodState {
  const [period, setPeriod] = useState<AnalyticsPeriodType>(initialPeriod);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(defaultAnalyticsDateRange);

  const effectiveRange = useMemo(
    () => resolveAnalyticsPeriodRange(period, dateRange),
    [period, dateRange]
  );
  const allTime = period === 'all_time';

  return {
    period,
    setPeriod,
    dateRange,
    setDateRange,
    allTime,
    effectiveRange,
    isReady: analyticsRangeEnabled(allTime, effectiveRange)
  };
}
