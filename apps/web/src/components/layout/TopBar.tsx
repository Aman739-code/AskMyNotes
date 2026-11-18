import { Search, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export function TopBar({ onOpenCommandPalette }: TopBarProps) {
  // Query rate-limit usage
  const { data: usage } = useQuery({
    queryKey: ['rateLimitUsage'],
    queryFn: async () => {
      try {
        return await api.get<{ remaining: number; limit: number; resetSeconds: number }>('/usage/limits');
      } catch {
        return { remaining: 18, limit: 20, resetSeconds: 45 };
      }
    },
    refetchInterval: 30000,
  });

  return (
    <header className="h-14 border-b border-ink/10 dark:border-paper/10 bg-paper dark:bg-night flex items-center justify-between px-6 select-none shrink-0">
      {/* Search & Command Palette Trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-3 px-3 py-1.5 rounded-btn border border-ink/15 dark:border-paper/15 bg-ink/[0.02] dark:bg-paper/[0.02] hover:bg-ink/[0.05] dark:hover:bg-paper/[0.05] text-xs text-ink/60 dark:text-paper/60 transition-colors w-64 md:w-80"
        aria-label="Search documents and chats (Command K)"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Jump to notes or chats...</span>
        <kbd className="font-mono text-[10px] bg-ink/10 dark:bg-paper/10 px-1.5 py-0.5 rounded border border-ink/10 dark:border-paper/10">
          ⌘K
        </kbd>
      </button>

      {/* Right Controls: Free-tier Quota Meter + Theme Toggle */}
      <div className="flex items-center gap-4">
        {usage && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-ink/10 dark:border-paper/10 bg-ink/[0.03] dark:bg-paper/[0.03] text-xs font-mono">
            <Zap size={12} className="text-forest dark:text-acid fill-current" />
            <span className="text-ink/80 dark:text-paper/80">
              {usage.remaining}/{usage.limit} chats left
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
          </div>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
