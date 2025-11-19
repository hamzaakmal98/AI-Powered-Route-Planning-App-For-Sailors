import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

type ConcernsValues = {
  mainConcerns: string[];
  additionalConcerns: string;
};

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
  const [values, setValues] = useState<ConcernsValues>({
    mainConcerns: initialValues?.mainConcerns ?? [],
    additionalConcerns: initialValues?.additionalConcerns ?? '',
  });

  const toggleConcern = (concern: string) => {
    setValues((prev) => {
      const exists = prev.mainConcerns.includes(concern);
      return {
        ...prev,
        mainConcerns: exists ? prev.mainConcerns.filter((c) => c !== concern) : [...prev.mainConcerns, concern],
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
        <CardTitle>Concerns & real talk</CardTitle>
        <CardDescription>We’ll address fears head-on so nothing catches you off guard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <Label className="text-muted-foreground">What's on your mind?</Label>
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
              value={values.additionalConcerns}
              placeholder="Use this space to tell us anything that's keeping you from feeling ready."
              className="rounded-2xl"
              onChange={(event) => setValues((prev) => ({ ...prev, additionalConcerns: event.target.value }))}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Finish onboarding'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

