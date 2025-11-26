import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Form } from '@/components/ui/form';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

const sailingExperienceSchema = z.object({
  experienceLevel: z.string().min(1, 'Please choose your experience level.'),
  certifications: z.array(z.string()),
  mechanicalSkills: z.string().min(1, 'Please tell us your mechanical confidence.'),
  longestPassage: z.string().min(1, 'Please select your longest passage so far.'),
});

type SailingExperienceValues = z.infer<typeof sailingExperienceSchema>;

const experienceLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const certificationOptions = [
  'ASA 101',
  'ASA 103',
  'ASA 104',
  'ASA 105',
  'ASA 106',
  'US Sailing',
  'RYA',
  'Other',
  'None',
];

const mechanicalSkillLevels = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const passageOptions = [
  'Day sails only',
  'Overnight (1-2 days)',
  'Multi-day (3-7 days)',
  'Offshore (7+ days)',
  'Ocean crossing',
];

export function SailingExperienceForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: OnboardingFormProps<SailingExperienceValues>) {
  const form = useForm<SailingExperienceValues>({
    resolver: zodResolver(sailingExperienceSchema),
    defaultValues: {
      experienceLevel: initialValues?.experienceLevel ?? '',
      certifications: initialValues?.certifications ?? [],
      mechanicalSkills: initialValues?.mechanicalSkills ?? '',
      longestPassage: initialValues?.longestPassage ?? '',
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = form;

  const values = watch();

  const toggleCertification = (cert: string) => {
    const current = values.certifications ?? [];
    const exists = current.includes(cert);
    const next = exists ? current.filter((c) => c !== cert) : [...current, cert];
    setValue('certifications', next, { shouldValidate: false });
  };

  const onValidSubmit = (data: SailingExperienceValues) => {
    onSubmit(data);
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Your sailing background</CardTitle>
        <CardDescription>Help us understand your comfort level on the water.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit(onValidSubmit)}>
          <div className="space-y-3">
            <Label className="text-muted-foreground">Experience Level</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {experienceLevels.map((option) => (
                <SelectButton
                  key={option.value}
                  selected={values.experienceLevel === option.value}
                  onClick={() => setValue('experienceLevel', option.value, { shouldValidate: true })}
                >
                  {option.label}
                </SelectButton>
              ))}
            </div>
            {errors.experienceLevel && (
              <p className="text-xs text-destructive mt-1">{errors.experienceLevel.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Certifications</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {certificationOptions.map((cert) => (
                <SelectButton
                  key={cert}
                  selected={values.certifications.includes(cert)}
                  onClick={() => toggleCertification(cert)}
                >
                  {cert}
                </SelectButton>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Mechanical confidence</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {mechanicalSkillLevels.map((option) => (
                <SelectButton
                  key={option.value}
                  selected={values.mechanicalSkills === option.value}
                  onClick={() => setValue('mechanicalSkills', option.value, { shouldValidate: true })}
                >
                  {option.label}
                </SelectButton>
              ))}
            </div>
            {errors.mechanicalSkills && (
              <p className="text-xs text-destructive mt-1">{errors.mechanicalSkills.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Longest passage</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {passageOptions.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.longestPassage === option}
                  onClick={() => setValue('longestPassage', option, { shouldValidate: true })}
                >
                  {option}
                </SelectButton>
              ))}
            </div>
            {errors.longestPassage && (
              <p className="text-xs text-destructive mt-1">{errors.longestPassage.message}</p>
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

