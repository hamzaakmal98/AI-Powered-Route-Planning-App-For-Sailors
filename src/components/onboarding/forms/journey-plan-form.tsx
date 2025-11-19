import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

type JourneyPlanValues = {
  journeyType: string;
  primaryDestination: string;
  journeyDuration: string;
};

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
  const [values, setValues] = useState<JourneyPlanValues>({
    journeyType: initialValues?.journeyType ?? '',
    primaryDestination: initialValues?.primaryDestination ?? '',
    journeyDuration: initialValues?.journeyDuration ?? '',
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>What are you planning?</CardTitle>
        <CardDescription>Your dream voyage helps us set the right milestones.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <Label className="text-muted-foreground">Journey type</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {journeyTypes.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.journeyType === option}
                  onClick={() => setValues((prev) => ({ ...prev, journeyType: option }))}
                >
                  {option}
                </SelectButton>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryDestination">Primary destination or route</Label>
            <Textarea
              id="primaryDestination"
              value={values.primaryDestination}
              placeholder="Share any destinations or routes you're excited about..."
              rows={3}
              className="rounded-2xl"
              onChange={(event) => setValues((prev) => ({ ...prev, primaryDestination: event.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">How long do you want to be out?</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {journeyDurations.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.journeyDuration === option}
                  onClick={() => setValues((prev) => ({ ...prev, journeyDuration: option }))}
                >
                  {option}
                </SelectButton>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save & continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

