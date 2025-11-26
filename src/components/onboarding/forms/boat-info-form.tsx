import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Form } from '@/components/ui/form';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

const NO_BOAT_OPTION = "Don't have a boat now";

const boatInfoSchema = z
  .object({
    boatType: z.string().min(1, 'Please select a boat type.'),
    boatLength: z.string().optional(),
    boatName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.boatType && data.boatType !== NO_BOAT_OPTION) {
      if (!data.boatLength || data.boatLength.trim() === '') {
        ctx.addIssue({
          code: "custom",
          path: ['boatLength'],
          message: 'Please enter your boat length.',
        });
        return;
      }
      const numeric = Number(data.boatLength);
      if (Number.isNaN(numeric)) {
        ctx.addIssue({
          code: "custom",
          path: ['boatLength'],
          message: 'Boat length must be a number.',
        });
      } else if (numeric < 10 || numeric > 200) {
        ctx.addIssue({
          code: "custom",
          path: ['boatLength'],
          message: 'Boat length should be between 10 and 200 feet.',
        });
      }
    }
  });

type BoatInfoValues = z.infer<typeof boatInfoSchema>;

const boatTypes = [
  'Sailboat (Monohull)',
  'Catamaran',
  'Trimaran',
  'Motor Yacht',
  'Trawler',
  'Other',
];

export function BoatInfoForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: OnboardingFormProps<BoatInfoValues>) {
  const form = useForm<BoatInfoValues>({
    resolver: zodResolver(boatInfoSchema),
    defaultValues: {
      boatType: initialValues?.boatType ?? '',
      boatLength: initialValues?.boatLength?.toString() ?? '',
      boatName: initialValues?.boatName ?? '',
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

  const onValidSubmit = (data: BoatInfoValues) => {
    onSubmit({
      ...data,
      boatLength: data.boatLength ?? '',
    });
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Tell us about your boat</CardTitle>
        <CardDescription>These details help us tailor your preparation plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit(onValidSubmit)}>
          <div className="space-y-2">
            <Label>Boat Type</Label>
            <div className="space-y-2">
              <SelectButton
                selected={values.boatType === NO_BOAT_OPTION}
                onClick={() => {
                  setValue('boatType', NO_BOAT_OPTION, { shouldValidate: true });
                  setValue('boatLength', '', { shouldValidate: true });
                  setValue('boatName', '', { shouldValidate: false });
                }}
                className="w-full"
              >
                {NO_BOAT_OPTION}
              </SelectButton>
              <div className="grid grid-cols-2 gap-2">
                {boatTypes.map((type) => (
                  <SelectButton
                    key={type}
                    selected={values.boatType === type}
                    onClick={() => setValue('boatType', type, { shouldValidate: true })}
                  >
                    {type}
                  </SelectButton>
                ))}
              </div>
            </div>
            {errors.boatType && (
              <p className="text-xs text-destructive mt-1">{errors.boatType.message}</p>
            )}
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
                  placeholder="e.g., 42"
                  {...register('boatLength')}
                />
                {errors.boatLength && (
                  <p className="text-xs text-destructive mt-1">{errors.boatLength.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="boatName">Boat Name (optional)</Label>
                <Input
                  id="boatName"
                  placeholder="If you have a name for your boat, share it!"
                  {...register('boatName')}
                />
              </div>
            </>
          )}

            <Button type="submit" className="w-full" disabled={isSubmitting || isFormSubmitting}>
              {isSubmitting || isFormSubmitting ? 'Saving...' : 'Save & continue'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

