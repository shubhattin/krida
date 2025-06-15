'use client';

import { useEffect, useState } from 'react';
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
  SelectValue,
  SelectLabel,
  SelectGroup
} from '~/components/ui/select';
import { ChevronDownIcon, PlusIcon } from 'lucide-react';
import { client_q } from '~/api/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const DEFAULT_START_END_TIME = '05:00';

const AddSchedule = ({ puzzle_list }: { puzzle_list: { id: number; title: string }[] }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [puzzleId, setPuzzleId] = useState<number | undefined>(undefined);

  const [startEndTime, setStartEndTime] = useState<string>(DEFAULT_START_END_TIME + ':00');

  const router = useRouter();

  const add_schedule_mut = client_q.schedules.add_puzzle_schedule.useMutation({
    onSuccess(data) {
      if (data.success) {
        toast.success('Schedule added successfully');
        router.push(`/padavali/schedules`);
      } else if (data.error_code === 'already_exists_in_time_range') {
        toast.error('A schedule already exists in the time range');
      }
    },
    onError(error) {
      toast.error('Failed to add schedule');
    }
  });

  const invalid_state_condition =
    !puzzleId || !startDate || !endDate || startDate > endDate || startDate === endDate;

  const handle_add_schedule = () => {
    if (invalid_state_condition) {
      toast.error('Please fill all the fields correctly');
      return;
    }
    add_schedule_mut.mutate({ puzzle_id: puzzleId, start_time: startDate, end_time: endDate });
  };

  const set_seconds_in_time_string = (time_string: string, seconds: number) => {
    const [hours, minutes] = time_string.split(':');
    return `${hours}:${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Select Date Range</h3>
        <div className="flex gap-4">
          <ISTDateTimePicker
            date={startDate}
            onChangeDate={setStartDate}
            label="Start Date"
            start_end_time={startEndTime}
            type="start"
          />
          <ISTDateTimePicker
            date={endDate}
            disabled={!startDate}
            onChangeDate={setEndDate}
            label="End Date"
            start_end_time={startEndTime}
            type="end"
            disable_before={startDate}
          />
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
            value={startEndTime}
            onChange={(e) => setStartEndTime(e.target.value)}
            className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div>
            Start Time: <span>{set_seconds_in_time_string(startEndTime, 1)}</span>
          </div>
          <div>
            End Time: <span>{set_seconds_in_time_string(startEndTime, 0)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="px-1">Select Puzzle</Label>
        <Select value={puzzleId?.toString()} onValueChange={(value) => setPuzzleId(Number(value))}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose a puzzle" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Puzzles</SelectLabel>
              {puzzle_list.map((puzzle) => (
                <SelectItem key={puzzle.id} value={puzzle.id.toString()}>
                  {puzzle.title}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handle_add_schedule}
        className="w-32 gap-1 font-bold text-amber-500"
        variant="outline"
        disabled={add_schedule_mut.isPending}
      >
        <PlusIcon className="-mt-1 inline-block size-5" />
        {add_schedule_mut.isPending ? 'Adding...' : 'Add Schedule'}
      </Button>
    </div>
  );
};

export default AddSchedule;

interface DatePickerProps {
  date: Date | undefined;
  onChangeDate: (date: Date | undefined) => void;
  label: string;
  id?: string;
  start_end_time: string;
  type: 'start' | 'end';
  disabled?: boolean;
  disable_before?: Date;
}

const ISTDateTimePicker: React.FC<DatePickerProps> = ({
  date,
  onChangeDate,
  label,
  start_end_time,
  type,
  disabled,
  disable_before
}) => {
  const [open, setOpen] = useState(false);
  const [internalDate, setInternalDate] = useState<Date | undefined>(date);

  useEffect(() => {
    if (!internalDate) return;
    const selectedDate = internalDate.getDate();
    const year = internalDate.getFullYear();
    const month = internalDate.getMonth();
    const [hours, minutes] = start_end_time.split(':').map(Number);

    // making the IST date string manually to prevent any timezone issues
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    const timeStr =
      `${String(hours || 0).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:` +
      (type === 'start' ? '01' : '00');
    // the starting part is delayed 1 second to differentiate
    const istDateString = `${dateStr}T${timeStr}+05:30`;

    const dateInIST = new Date(istDateString);
    onChangeDate(dateInIST);
  }, [internalDate, start_end_time]);

  return (
    <div className="flex flex-col gap-3">
      <Label className="px-1">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-32 justify-between font-normal"
            disabled={disabled}
          >
            {internalDate
              ? internalDate.toLocaleDateString('en-GB', {
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
            selected={internalDate}
            captionLayout="dropdown"
            onSelect={(_date) => {
              setInternalDate(_date);
              setOpen(false);
            }}
            disabled={(date) => {
              if (disable_before && date < disable_before) return true;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
