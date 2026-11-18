import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  statusText?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, label, statusText, size = 'md', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={clsx('w-full', className)}>
      {(label || statusText) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs font-medium text-ink dark:text-paper">{label}</span>}
          {statusText && <span className="text-xs font-mono text-ink/60 dark:text-paper/60">{statusText}</span>}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-ink/[0.08] dark:bg-paper/[0.08] rounded-full overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full bg-acid rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
