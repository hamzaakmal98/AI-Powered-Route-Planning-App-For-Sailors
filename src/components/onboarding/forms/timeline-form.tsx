import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

type TimelineValues = {
  departureDate: string;
  preparationTimeline: string;
  currentPreparationStatus: string;
};

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
  const [values, setValues] = useState<TimelineValues>({
    departureDate: initialValues?.departureDate ?? '',
    preparationTimeline: initialValues?.preparationTimeline ?? '',
    currentPreparationStatus: initialValues?.currentPreparationStatus ?? '',
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Timeline & readiness</CardTitle>
        <CardDescription>We’ll tailor your checklist to match your countdown.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="departureDate">Target departure date</Label>
            <DatePicker
              value={values.departureDate}
              onChange={(date) => setValues((prev) => ({ ...prev, departureDate: date }))}
              placeholder="Select departure date"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">How much prep time do you have?</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {preparationWindows.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.preparationTimeline === option}
                  onClick={() => setValues((prev) => ({ ...prev, preparationTimeline: option }))}
                >
                  {option}
                </SelectButton>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Where are you in the process?</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {preparationStatuses.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.currentPreparationStatus === option}
                  onClick={() => setValues((prev) => ({ ...prev, currentPreparationStatus: option }))}
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

