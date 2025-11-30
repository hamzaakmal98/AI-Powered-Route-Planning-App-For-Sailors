import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SelectButton } from '@/components/onboarding/forms/select-button';

const DOMAINS = [
  'Boat Maintenance',
  'Skill Building',
  'Weather Routing',
  'Safety Systems',
  'Budget Management',
  'Passage Planning',
  'Timeline Management',
] as const;

export type TaskDomain = typeof DOMAINS[number];

interface DomainSelectorProps {
  onSelect: (domain: TaskDomain) => void;
  isSubmitting?: boolean;
}

export function DomainSelector({ onSelect, isSubmitting }: DomainSelectorProps) {
  const [selectedDomain, setSelectedDomain] = useState<TaskDomain | null>(null);

  const handleSelect = (domain: TaskDomain) => {
    setSelectedDomain(domain);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDomain) {
      onSelect(selectedDomain);
    }
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>Select a domain</CardTitle>
        <CardDescription>Choose the category for your new task.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2 md:grid-cols-2">
            {DOMAINS.map((domain) => (
              <SelectButton
                key={domain}
                selected={selectedDomain === domain}
                onClick={() => handleSelect(domain)}
              >
                {domain}
              </SelectButton>
            ))}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!selectedDomain || isSubmitting}
          >
            {isSubmitting ? 'Continuing...' : 'Continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

