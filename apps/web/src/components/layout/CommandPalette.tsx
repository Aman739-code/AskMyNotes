import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, MessageSquare, Plus, Sparkles, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      return api.get<Array<{ id: string; title: string }>>('/documents');
    },
    enabled: isOpen,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      return api.get<Array<{ id: string; title: string }>>('/conversations');
    },
    enabled: isOpen,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-[100vw] flex items-start justify-center pt-20 px-4 bg-ink/75 dark:bg-black/85 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative z-[101] w-full max-w-xl rounded-card bg-paper dark:bg-night border-2 border-ink dark:border-paper/20 shadow-offset overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink/10 dark:border-paper/10">
          <Search size={18} className="text-ink/50 dark:text-paper/50" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, document, or conversation..."
            className="flex-1 bg-transparent text-sm text-ink dark:text-paper placeholder:text-ink/40 dark:placeholder:text-paper/40 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-btn hover:bg-ink/5 dark:hover:bg-paper/5 text-ink/50 dark:text-paper/50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-ink/40 dark:text-paper/40">
              Actions
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleSelect('/app/chat')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-btn text-xs text-left text-ink dark:text-paper hover:bg-acid/20 transition-colors"
              >
                <Plus size={14} className="text-forest dark:text-acid" />
                <span>Start a new study conversation</span>
              </button>
              <button
                onClick={() => handleSelect('/app/library')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-btn text-xs text-left text-ink dark:text-paper hover:bg-acid/20 transition-colors"
              >
                <BookOpen size={14} className="text-forest dark:text-acid" />
                <span>Upload new study notes / PDFs</span>
              </button>
              <button
                onClick={() => handleSelect('/app/study')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-btn text-xs text-left text-ink dark:text-paper hover:bg-acid/20 transition-colors"
              >
                <Sparkles size={14} className="text-forest dark:text-acid" />
                <span>Review flashcards & take quiz</span>
              </button>
            </div>
          </div>

          {/* Filtered Documents */}
          {filteredDocs.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-ink/40 dark:text-paper/40">
                Documents
              </div>
              <div className="space-y-0.5">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelect(`/app/library?doc=${doc.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-btn text-xs text-left text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors truncate"
                  >
                    <BookOpen size={14} className="shrink-0 opacity-60" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtered Chats */}
          {filteredConvs.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-ink/40 dark:text-paper/40">
                Conversations
              </div>
              <div className="space-y-0.5">
                {filteredConvs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelect(`/app/chat/${conv.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-btn text-xs text-left text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors truncate"
                  >
                    <MessageSquare size={14} className="shrink-0 opacity-60" />
                    <span className="truncate">{conv.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-ink/10 dark:border-paper/10 bg-ink/[0.02] dark:bg-paper/[0.02] flex items-center justify-between text-[11px] font-mono text-ink/50 dark:text-paper/50">
          <span>Navigate with arrows, Enter to select</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
