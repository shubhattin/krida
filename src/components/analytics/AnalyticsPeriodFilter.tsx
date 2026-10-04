'use client';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { cn } from '~/lib/utils';
import {
  ANALYTICS_PERIOD_ITEMS,
  type AnalyticsDateRange,
  type AnalyticsPeriodType
} from './analytics_period';

export function AnalyticsPeriodSelect({
  period,
  onPeriodChange
}: {
  period: AnalyticsPeriodType;
  onPeriodChange: (period: AnalyticsPeriodType) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Period</span>
      <Select
        items={ANALYTICS_PERIOD_ITEMS}
        value={period}
        onValueChange={(value) => {
          if (value) onPeriodChange(value);
        }}
      >
        <SelectTrigger size="sm" className="h-8 w-36" aria-label="Select period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_time">All Time</SelectItem>
          <SelectItem value="last_week">Last Week</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function DateTrigger({
  label,
  value,
  onSelect,
  isDisabled
}: {
  label: string;
  value: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  isDisabled: (date: Date) => boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-8 justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="mr-1.5 size-3.5" />
        {value ? format(value, 'MMM d, yyyy') : 'Pick date'}
        <span className="sr-only">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onSelect} disabled={isDisabled} />
      </PopoverContent>
    </Popover>
  );
}

/** From / to pickers — only rendered while the period is `custom`. */
export function AnalyticsCustomRangePicker({
  dateRange,
  onDateRangeChange
}: {
  dateRange: AnalyticsDateRange;
  onDateRangeChange: (range: AnalyticsDateRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">From</span>
      <DateTrigger
        label="Range start"
        value={dateRange.from}
        onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
        isDisabled={(date) => !!dateRange.to && date > dateRange.to}
      />
      <span className="text-xs font-medium text-muted-foreground">To</span>
      <DateTrigger
        label="Range end"
        value={dateRange.to}
        onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
        isDisabled={(date) => !!dateRange.from && date < dateRange.from}
      />
    </div>
  );
}

/** Period select plus the custom range pickers underneath it. */
export function AnalyticsPeriodFilter({
  period,
  onPeriodChange,
  dateRange,
  onDateRangeChange
}: {
  period: AnalyticsPeriodType;
  onPeriodChange: (period: AnalyticsPeriodType) => void;
  dateRange: AnalyticsDateRange;
  onDateRangeChange: (range: AnalyticsDateRange) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <AnalyticsPeriodSelect period={period} onPeriodChange={onPeriodChange} />
      {period === 'custom' ? (
        <AnalyticsCustomRangePicker dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
      ) : null}
    </div>
  );
}
