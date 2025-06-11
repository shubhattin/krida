'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { ChevronDownIcon } from 'lucide-react';

const DEFAULT_START_END_TIME = '05:00';

const AddSchedule = ({ puzzle_list }: { puzzle_list: { id: number; title: string }[] }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [puzzleId, setPuzzleId] = useState<number | undefined>(undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Select Date Range</h3>
        <div className="flex gap-4">
          <ISTDateTimePicker date={startDate} setDate={setStartDate} label="Start Date" />
          <ISTDateTimePicker date={endDate} setDate={setEndDate} label="End Date" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex w-32 flex-col gap-3">
          <Label htmlFor="time" className="px-1">
            Start/End Time
          </Label>
          <Input
            type="time"
            id="time"
            step="1"
            defaultValue={DEFAULT_START_END_TIME}
            className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="px-1">Select Puzzle</Label>
        <Select value={puzzleId?.toString()} onValueChange={(value) => setPuzzleId(Number(value))}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose a puzzle" />
          </SelectTrigger>
          <SelectContent>
            {puzzle_list.map((puzzle) => (
              <SelectItem key={puzzle.id} value={puzzle.id.toString()}>
                {puzzle.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default AddSchedule;

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  label: string;
  id?: string;
}

const ISTDateTimePicker: React.FC<DatePickerProps> = ({ date, setDate, label }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Label className="px-1">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-32 justify-between font-normal">
            {date
              ? date.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              : 'Select date'}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(date) => {
              setDate(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
