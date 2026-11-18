import { clsx } from 'clsx';

type ChipVariant = 'lilac' | 'acid' | 'tangerine' | 'neutral';

interface ChipProps {
  variant?: ChipVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantClasses: Record<ChipVariant, string> = {
  lilac: 'chip-lilac',
  acid: 'chip-acid',
  tangerine: 'chip-tangerine',
  neutral: 'chip bg-ink/[0.06] dark:bg-paper/[0.06] text-ink/70 dark:text-paper/70',
};

export function Chip({ variant = 'neutral', children, className, onClick }: ChipProps) {
  const Component = onClick ? 'button' : 'span';
  return (
    <Component
      className={clsx(variantClasses[variant], onClick && 'cursor-pointer hover:opacity-80', className)}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Component>
  );
}
