import { z } from 'zod';

// TODO: those schema is on longer used in actual code, consider remove this

export const formTypeSchema = z.enum([
  'boat_info',
  'sailing_experience',
  'journey_plan',
  'timeline',
  'goals_priorities',
  'concerns_challenges',
]);

export type FormType = z.infer<typeof formTypeSchema>;

