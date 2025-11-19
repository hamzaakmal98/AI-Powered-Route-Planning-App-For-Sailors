'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatDate(date: Date | undefined) {
  if (!date) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value) : undefined;
  const [month, setMonth] = React.useState<Date | undefined>(date || new Date());
  const [inputValue, setInputValue] = React.useState(formatDate(date));

  // Update input value when date prop changes
  React.useEffect(() => {
    if (date) {
      setInputValue(formatDate(date));
      setMonth(date);
    } else {
      setInputValue('');
    }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const fromYear = currentYear;
  const toYear = currentYear + 10; // Allow up to 10 years in the future, TODO: move this to props

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Try to parse the input as a date
    const parsedDate = new Date(newValue);
    if (isValidDate(parsedDate)) {
      // Check if date is in the future (from today onwards)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      parsedDate.setHours(0, 0, 0, 0);
      
      if (parsedDate >= today && parsedDate.getFullYear() >= currentYear) {
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        onChange(formattedDate);
        setMonth(parsedDate);
      }
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      onChange(formattedDate);
      setInputValue(formatDate(selectedDate));
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className={className}>
      <div className="relative flex gap-2">
        <Input
          value={inputValue}
          placeholder={placeholder}
          className="bg-background pr-10"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              disabled={disabled}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={handleCalendarSelect}
              fromYear={fromYear}
              toYear={toYear}
              disabled={(date) => {
                // Disable dates before today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                date.setHours(0, 0, 0, 0);
                return date < today;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

