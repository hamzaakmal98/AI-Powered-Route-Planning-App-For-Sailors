import React from 'react';

import { FormType } from '@/app/api/onboarding/schema';

export interface OnboardingFormProps<TValues extends Record<string, any>> {
  initialValues?: Partial<TValues>;
  onSubmit: (values: TValues) => void;
  isSubmitting?: boolean;
}

export type OnboardingFormComponent<TValues extends Record<string, any>> = React.FC<
  OnboardingFormProps<TValues>
>;

export type { FormType };

