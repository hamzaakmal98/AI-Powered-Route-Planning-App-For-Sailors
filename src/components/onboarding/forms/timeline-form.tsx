import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Form } from '@/components/ui/form';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

const timelineSchema = z.object({
  departureDate: z.string().min(1, 'Please choose a target departure date.'),
  preparationTimeline: z.string().min(1, 'Please tell us how much prep time you have.'),
  currentPreparationStatus: z.string().min(1, 'Please tell us where you are in the process.'),
});

type TimelineValues = z.infer<typeof timelineSchema>;

const preparationWindows = [
  'Less than 3 months',
  '3-6 months',
  '6-12 months',
  'More than 12 months',
  'Flexible timeline',
];

/**
 * Calculates the number of months between today and the departure date
 */
function calculateMonthsUntilDeparture(departureDateStr: string | undefined): number | null {
  if (!departureDateStr) return null;
  
  try {
    // Parse the date string (format: yyyy-MM-dd)
    const parts = departureDateStr.split('-');
    if (parts.length !== 3) return null;
    
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    
    if (!year || !month || !day) return null;
    
    const departureDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    departureDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in months
    const yearsDiff = departureDate.getFullYear() - today.getFullYear();
    const monthsDiff = departureDate.getMonth() - today.getMonth();
    const totalMonths = yearsDiff * 12 + monthsDiff;
    
    // Adjust for days (if departure is earlier in the month, count as one less month)
    if (departureDate.getDate() < today.getDate()) {
      return Math.max(0, totalMonths - 1);
    }
    
    return Math.max(0, totalMonths);
  } catch {
    return null;
  }
}

/**
 * Determines the preparation timeline category based on months until departure
 */
function getPreparationTimeline(months: number | null): string {
  if (months === null) return '';
  
  if (months < 3) {
    return 'Less than 3 months';
  } else if (months < 6) {
    return '3-6 months';
  } else if (months < 12) {
    return '6-12 months';
  } else {
    return 'More than 12 months';
  }
}

const preparationStatuses = [
  'Just starting',
  'Some progress',
  'Well organized',
  'Almost ready',
];

export function TimelineForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: OnboardingFormProps<TimelineValues>) {
  const form = useForm<TimelineValues>({
    resolver: zodResolver(timelineSchema),
    defaultValues: {
      departureDate: initialValues?.departureDate ?? '',
      preparationTimeline: initialValues?.preparationTimeline ?? '',
      currentPreparationStatus: initialValues?.currentPreparationStatus ?? '',
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = form;

  const values = watch();

  // Calculate prep time based on departure date
  const monthsUntilDeparture = useMemo(() => {
    return calculateMonthsUntilDeparture(values.departureDate);
  }, [values.departureDate]);

  const calculatedPrepTimeline = useMemo(() => {
    return getPreparationTimeline(monthsUntilDeparture);
  }, [monthsUntilDeparture]);

  // Auto-update preparationTimeline when departure date changes
  useEffect(() => {
    if (calculatedPrepTimeline && values.departureDate) {
      setValue('preparationTimeline', calculatedPrepTimeline, { shouldValidate: true });
    }
  }, [calculatedPrepTimeline, values.departureDate, setValue]);

  const onValidSubmit = (data: TimelineValues) => {
    // Ensure preparationTimeline is calculated if it's missing
    if (!data.preparationTimeline && data.departureDate) {
      const months = calculateMonthsUntilDeparture(data.departureDate);
      const timeline = getPreparationTimeline(months);
      if (timeline) {
        data.preparationTimeline = timeline;
      }
    }
    onSubmit(data);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Timeline & readiness</CardTitle>
        <CardDescription>We’ll tailor your checklist to match your countdown.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onValidSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="departureDate">Target departure date</Label>
            <DatePicker
              value={values.departureDate}
              onChange={(date) => {
                setValue('departureDate', date, { shouldValidate: true });
                // Immediately calculate and set prep timeline when date changes
                if (date) {
                  const months = calculateMonthsUntilDeparture(date);
                  const timeline = getPreparationTimeline(months);
                  if (timeline) {
                    setValue('preparationTimeline', timeline, { shouldValidate: true });
                  }
                }
              }}
              placeholder="Select departure date"
              disabled={isSubmitting}
            />
            {errors.departureDate && (
              <p className="text-xs text-destructive mt-1">{errors.departureDate.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">How much prep time do you have?</Label>
            <div className="rounded-2xl border bg-muted/20 p-4">
              {values.departureDate ? (
                <div className="text-sm">
                  <span className="text-muted-foreground">Calculated: </span>
                  <span className="font-medium">{calculatedPrepTimeline || 'Calculating...'}</span>
                  {monthsUntilDeparture !== null && (
                    <span className="text-muted-foreground text-xs block mt-1">
                      ({monthsUntilDeparture} {monthsUntilDeparture === 1 ? 'month' : 'months'} until departure)
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Select a departure date to calculate your prep time
                </div>
              )}
            </div>
            {errors.preparationTimeline && (
              <p className="text-xs text-destructive mt-1">{errors.preparationTimeline.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Where are you in the process?</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {preparationStatuses.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.currentPreparationStatus === option}
                  onClick={() => setValue('currentPreparationStatus', option, { shouldValidate: true })}
                >
                  {option}
                </SelectButton>
              ))}
            </div>
            {errors.currentPreparationStatus && (
              <p className="text-xs text-destructive mt-1">{errors.currentPreparationStatus.message}</p>
            )}
          </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || isFormSubmitting}>
              {isSubmitting || isFormSubmitting ? 'Saving...' : 'Save & continue'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

