import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SelectButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectButton({ selected, onClick, children, className }: SelectButtonProps) {
  return (
    <Button
      type="button"
      variant={selected ? 'default' : 'outline'}
      onClick={onClick}
      className={cn(
        'h-auto rounded-2xl border px-4 py-3 text-left text-sm transition',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow'
          : 'border-muted bg-background hover:border-primary/40',
        className,
      )}
    >
      {children}
    </Button>
  );
}

