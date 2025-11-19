import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

type GoalsValues = {
  primaryGoals: string[];
  biggestChallenge: string;
};

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
  const [values, setValues] = useState<GoalsValues>({
    primaryGoals: initialValues?.primaryGoals ?? [],
    biggestChallenge: initialValues?.biggestChallenge ?? '',
  });

  const toggleGoal = (goal: string) => {
    setValues((prev) => {
      const exists = prev.primaryGoals.includes(goal);
      return {
        ...prev,
        primaryGoals: exists ? prev.primaryGoals.filter((g) => g !== goal) : [...prev.primaryGoals, goal],
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Your priorities</CardTitle>
        <CardDescription>We’ll focus on the areas that matter most to you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="biggestChallenge">Biggest challenge right now</Label>
            <Textarea
              id="biggestChallenge"
              rows={3}
              value={values.biggestChallenge}
              placeholder="Tell us what keeps you up at night..."
              className="rounded-2xl"
              onChange={(event) => setValues((prev) => ({ ...prev, biggestChallenge: event.target.value }))}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save & continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

