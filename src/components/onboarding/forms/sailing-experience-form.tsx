import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { OnboardingFormProps } from './types';
import { SelectButton } from './select-button';

type SailingExperienceValues = {
  experienceLevel: string;
  certifications: string[];
  mechanicalSkills: string;
  longestPassage: string;
};

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
  const [values, setValues] = useState<SailingExperienceValues>({
    experienceLevel: initialValues?.experienceLevel ?? '',
    certifications: initialValues?.certifications ?? [],
    mechanicalSkills: initialValues?.mechanicalSkills ?? '',
    longestPassage: initialValues?.longestPassage ?? '',
  });

  const toggleCertification = (cert: string) => {
    setValues((prev) => {
      const exists = prev.certifications.includes(cert);
      return {
        ...prev,
        certifications: exists
          ? prev.certifications.filter((c) => c !== cert)
          : [...prev.certifications, cert],
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
        <CardTitle>Your sailing background</CardTitle>
        <CardDescription>Help us understand your comfort level on the water.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <Label className="text-muted-foreground">Experience Level</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {experienceLevels.map((option) => (
                <SelectButton
                  key={option.value}
                  selected={values.experienceLevel === option.value}
                  onClick={() => setValues((prev) => ({ ...prev, experienceLevel: option.value }))}
                >
                  {option.label}
                </SelectButton>
              ))}
            </div>
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
                  onClick={() => setValues((prev) => ({ ...prev, mechanicalSkills: option.value }))}
                >
                  {option.label}
                </SelectButton>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Longest passage</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {passageOptions.map((option) => (
                <SelectButton
                  key={option}
                  selected={values.longestPassage === option}
                  onClick={() => setValues((prev) => ({ ...prev, longestPassage: option }))}
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

