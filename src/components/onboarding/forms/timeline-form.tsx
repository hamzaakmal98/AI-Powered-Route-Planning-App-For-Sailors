import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

  const onValidSubmit = (data: TimelineValues) => {
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
              onChange={(date) => setValue('departureDate', date, { shouldValidate: true })}
              placeholder="Select departure date"
              disabled={isSubmitting}
            />
            {errors.departureDate && (
              <p className="text-xs text-destructive mt-1">{errors.departureDate.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">How much prep time do you have?</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {preparationWindows.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.preparationTimeline === option}
                  onClick={() => setValue('preparationTimeline', option, { shouldValidate: true })}
                >
                  {option}
                </SelectButton>
              ))}
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

