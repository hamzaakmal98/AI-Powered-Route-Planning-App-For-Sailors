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

const concernsSchema = z
  .object({
    mainConcerns: z.array(z.string()),
    additionalConcerns: z.string(),
  })
  .refine(
    (data) => data.mainConcerns.length > 0 || data.additionalConcerns.trim().length > 0,
    {
      message: 'Please pick at least one concern or share something in the notes.',
      // use a root-level error instead of a specific field so we can show a form-wide message
      path: ['root'],
    },
  );

type ConcernsValues = z.infer<typeof concernsSchema>;

const concernOptions = [
  'Mechanical failures',
  'Weather surprises',
  'Navigation mistakes',
  'Budget overruns',
  'Crew dynamics',
  'Safety emergencies',
  'Information overload',
  'Not knowing the order of tasks',
];

export function ConcernsForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: OnboardingFormProps<ConcernsValues>) {
  const form = useForm<ConcernsValues>({
    resolver: zodResolver(concernsSchema),
    defaultValues: {
      mainConcerns: initialValues?.mainConcerns ?? [],
      additionalConcerns: initialValues?.additionalConcerns ?? '',
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

  const toggleConcern = (concern: string) => {
    const current = values.mainConcerns ?? [];
    const exists = current.includes(concern);
    const next = exists ? current.filter((c) => c !== concern) : [...current, concern];
    setValue('mainConcerns', next, { shouldValidate: true });
  };

  const onValidSubmit = (data: ConcernsValues) => {
    onSubmit(data);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Concerns & real talk</CardTitle>
        <CardDescription>We’ll address fears head-on so nothing catches you off guard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onValidSubmit)}>
          <div className="space-y-3">
            <Label className="text-muted-foreground">What&apos;s on your mind?</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {concernOptions.map((concern) => (
                <SelectButton
                  key={concern}
                  selected={values.mainConcerns.includes(concern)}
                  onClick={() => toggleConcern(concern)}
                >
                  {concern}
                </SelectButton>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalConcerns">Anything else you want to share?</Label>
            <Textarea
              id="additionalConcerns"
              rows={3}
              placeholder="Use this space to tell us anything that's keeping you from feeling ready."
              className="rounded-2xl"
              {...register('additionalConcerns')}
            />
          </div>

          {errors.root && (
            <p className="text-xs text-destructive mt-1">{errors.root.message}</p>
          )}

            <Button type="submit" className="w-full" disabled={isSubmitting || isFormSubmitting}>
              {isSubmitting || isFormSubmitting ? 'Saving...' : 'Finish onboarding'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

