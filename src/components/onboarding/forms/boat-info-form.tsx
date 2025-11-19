import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

type BoatInfoValues = {
  boatType: string;
  boatLength: string;
  boatName: string;
};

const boatTypes = [
  'Sailboat (Monohull)',
  'Catamaran',
  'Trimaran',
  'Motor Yacht',
  'Trawler',
  'Other',
];

const NO_BOAT_OPTION = "Don't have a boat now";

export function BoatInfoForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: OnboardingFormProps<BoatInfoValues>) {
  const [values, setValues] = useState<BoatInfoValues>({
    boatType: initialValues?.boatType ?? '',
    boatLength: initialValues?.boatLength?.toString() ?? '',
    boatName: initialValues?.boatName ?? '',
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      ...values,
      boatLength: values.boatLength,
    });
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Tell us about your boat</CardTitle>
        <CardDescription>These details help us tailor your preparation plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Boat Type</Label>
            <div className="space-y-2">
              <SelectButton
                selected={values.boatType === NO_BOAT_OPTION}
                onClick={() => setValues((prev) => ({ ...prev, boatType: NO_BOAT_OPTION, boatLength: '', boatName: '' }))}
                className="w-full"
              >
                {NO_BOAT_OPTION}
              </SelectButton>
              <div className="grid grid-cols-2 gap-2">
                {boatTypes.map((type) => (
                  <SelectButton
                    key={type}
                    selected={values.boatType === type}
                    onClick={() => setValues((prev) => ({ ...prev, boatType: type }))}
                  >
                    {type}
                  </SelectButton>
                ))}
              </div>
            </div>
          </div>

          {values.boatType !== NO_BOAT_OPTION && (
            <>
              <div className="space-y-2">
                <Label htmlFor="boatLength">Boat Length (feet)</Label>
                <Input
                  id="boatLength"
                  type="number"
                  min={10}
                  max={200}
                  value={values.boatLength}
                  placeholder="e.g., 42"
                  onChange={(event) => setValues((prev) => ({ ...prev, boatLength: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boatName">Boat Name (optional)</Label>
                <Input
                  id="boatName"
                  value={values.boatName}
                  placeholder="If you have a name for your boat, share it!"
                  onChange={(event) => setValues((prev) => ({ ...prev, boatName: event.target.value }))}
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save & continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

