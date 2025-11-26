import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form } from '@/components/ui/form';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

const goalsSchema = z.object({
  primaryGoals: z.array(z.string()).min(1, 'Please pick at least one priority.'),
});

type GoalsValues = z.infer<typeof goalsSchema>;

const goalOptions = [
  'Safety readiness',
  'Mechanical skills',
  'Navigation mastery',
  'Weather confidence',
  'Passage making',
  'Budget management',
  'Boat prep',
  'Crew coordination',
];

export function GoalsForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: OnboardingFormProps<GoalsValues>) {
  const form = useForm<GoalsValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      primaryGoals: initialValues?.primaryGoals ?? [],
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = form;

  const values = watch();
  const [customGoal, setCustomGoal] = useState('');

  const toggleGoal = (goal: string) => {
    const current = values.primaryGoals ?? [];
    const exists = current.includes(goal);
    const next = exists ? current.filter((g) => g !== goal) : [...current, goal];
    setValue('primaryGoals', next, { shouldValidate: true });
  };

  const handleAddCustomGoal = () => {
    const trimmed = customGoal.trim();
    if (!trimmed) return;
    const current = values.primaryGoals ?? [];
    if (current.includes(trimmed)) {
      setCustomGoal('');
      return;
    }
    setValue('primaryGoals', [...current, trimmed], { shouldValidate: true });
    setCustomGoal('');
  };

  const onValidSubmit = (data: GoalsValues) => {
    onSubmit(data);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Your priorities</CardTitle>
        <CardDescription>We’ll focus on the areas that matter most to you.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onValidSubmit)}>
            <div className="space-y-3">
              <Label className="text-muted-foreground">Pick your top priorities</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {goalOptions.map((goal) => (
                  <SelectButton
                    key={goal}
                    selected={values.primaryGoals.includes(goal)}
                    onClick={() => toggleGoal(goal)}
                  >
                    {goal}
                  </SelectButton>
                ))}
              </div>

              {/* Custom priorities input */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="customGoal">Add your own priority</Label>
                <div className="flex gap-2">
                  <Input
                    id="customGoal"
                    value={customGoal}
                    onChange={(event) => setCustomGoal(event.target.value)}
                    placeholder="e.g. Solo night sailing practice"
                    className="rounded-2xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomGoal}
                    disabled={!customGoal.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Show any custom priorities as chips */}
              {values.primaryGoals &&
                values.primaryGoals.some((g) => !goalOptions.includes(g)) && (
                  <div className="flex flex-wrap gap-2 pt-1 text-sm">
                    {values.primaryGoals
                      .filter((g) => !goalOptions.includes(g))
                      .map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {g}
                        </span>
                      ))}
                  </div>
                )}

              {errors.primaryGoals && (
                <p className="text-xs text-destructive mt-1">{errors.primaryGoals.message}</p>
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

