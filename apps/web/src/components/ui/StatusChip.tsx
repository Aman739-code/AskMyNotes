import { clsx } from 'clsx';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

type Status = 'queued' | 'parsing' | 'embedding' | 'ready' | 'failed';

const statusConfig: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  queued: {
    label: 'Queued',
    color: 'bg-ink/[0.06] dark:bg-paper/[0.06] text-ink/60 dark:text-paper/60',
    icon: <Clock size={12} strokeWidth={1.75} />,
  },
  parsing: {
    label: 'Parsing',
    color: 'bg-tangerine/15 text-tangerine',
    icon: <Loader2 size={12} strokeWidth={1.75} className="animate-spin" />,
  },
  embedding: {
    label: 'Embedding',
    color: 'bg-lilac/15 text-lilac',
    icon: <Loader2 size={12} strokeWidth={1.75} className="animate-spin" />,
  },
  ready: {
    label: 'Ready',
    color: 'bg-success/15 text-success',
    icon: <CheckCircle2 size={12} strokeWidth={1.75} />,
  },
  failed: {
    label: 'Failed',
    color: 'bg-danger/15 text-danger',
    icon: <AlertCircle size={12} strokeWidth={1.75} />,
  },
};

interface StatusChipProps {
  status: Status;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status];
  return (
    <span
      className={clsx(
        'chip',
        config.color,
        className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
