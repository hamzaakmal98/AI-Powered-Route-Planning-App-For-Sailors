import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form } from '@/components/ui/form';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

const journeyPlanSchema = z.object({
  journeyType: z.string().min(1, 'Please choose a journey type.'),
  primaryDestination: z.string().optional(),
  journeyDuration: z.string().min(1, 'Please choose how long you want to be out.'),
});

type JourneyPlanValues = z.infer<typeof journeyPlanSchema>;

const journeyTypes = [
  'Coastal cruising',
  'Island hopping',
  'Offshore passages',
  'Circumnavigation',
  'Liveaboard',
  'Still planning',
];

const journeyDurations = [
  '1-6 months',
  '6-12 months',
  '1-2 years',
  'Indefinite',
  'Not sure yet',
];

export function JourneyPlanForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: OnboardingFormProps<JourneyPlanValues>) {
  const form = useForm<JourneyPlanValues>({
    resolver: zodResolver(journeyPlanSchema),
    defaultValues: {
      journeyType: initialValues?.journeyType ?? '',
      primaryDestination: initialValues?.primaryDestination ?? '',
      journeyDuration: initialValues?.journeyDuration ?? '',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = form;

  const values = watch();

  const onValidSubmit = (data: JourneyPlanValues) => {
    onSubmit(data);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>What are you planning?</CardTitle>
        <CardDescription>Your dream voyage helps us set the right milestones.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onValidSubmit)}>
          <div className="space-y-3">
            <Label className="text-muted-foreground">Journey type</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {journeyTypes.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.journeyType === option}
                  onClick={() => setValue('journeyType', option, { shouldValidate: true })}
                >
                  {option}
                </SelectButton>
              ))}
            </div>
            {errors.journeyType && (
              <p className="text-xs text-destructive mt-1">{errors.journeyType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryDestination">Primary destination or route</Label>
            <Textarea
              id="primaryDestination"
              placeholder="Share any destinations or routes you're excited about..."
              rows={3}
              className="rounded-2xl"
              {...register('primaryDestination')}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">How long do you want to be out?</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {journeyDurations.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.journeyDuration === option}
                  onClick={() => setValue('journeyDuration', option, { shouldValidate: true })}
                >
                  {option}
                </SelectButton>
              ))}
            </div>
            {errors.journeyDuration && (
              <p className="text-xs text-destructive mt-1">{errors.journeyDuration.message}</p>
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

