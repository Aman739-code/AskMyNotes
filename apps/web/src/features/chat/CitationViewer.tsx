import { X, Copy, Check, BookOpen, Quote } from 'lucide-react';
import { useState } from 'react';
import { Citation } from '@askmynotes/shared';

interface CitationViewerProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationViewer({ citation, onClose }: CitationViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      className="w-full lg:w-96 border-l border-ink/10 dark:border-paper/10 bg-paper dark:bg-nightRaised flex flex-col h-full z-20 shrink-0 shadow-lg lg:shadow-none animate-slide-up"
      aria-label="Citation source inspector"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-ink/10 dark:border-paper/10 flex items-center justify-between bg-paper dark:bg-night">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-forest dark:bg-acid" />
          <span className="font-heading font-bold text-sm text-ink dark:text-paper">
            Source Citation
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-btn hover:bg-ink/5 dark:hover:bg-paper/5 text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper transition-colors"
          aria-label="Close citation inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Source Metadata Banner */}
      <div className="p-4 bg-ink/[0.02] dark:bg-paper/[0.02] border-b border-ink/10 dark:border-paper/10 space-y-2">
        <div className="flex items-start gap-2.5">
          <BookOpen size={16} className="text-forest dark:text-acid shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h4 className="font-heading font-bold text-xs text-ink dark:text-paper truncate">
              {citation.documentTitle}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-ink/60 dark:text-paper/60">
              {citation.pageNumber && (
                <span className="px-1.5 py-0.5 rounded bg-acid/20 text-forest dark:text-acid font-semibold">
                  Page {citation.pageNumber}
                </span>
              )}
              {citation.sectionHeading && (
                <span className="truncate max-w-[150px]">
                  § {citation.sectionHeading}
                </span>
              )}
              <span className="text-ink/40 dark:text-paper/40">
                score: {(citation.score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cited Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-ink/50 dark:text-paper/50">
          <span className="flex items-center gap-1">
            <Quote size={12} />
            <span>Extracted Chunk</span>
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors"
            title="Copy source passage"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="p-4 rounded-card border border-acid/50 bg-acid/5 text-ink dark:text-paper text-xs sm:text-sm leading-relaxed font-body shadow-xs select-text">
          {citation.content}
        </div>

        <div className="p-3 rounded-btn border border-ink/10 dark:border-paper/10 bg-ink/[0.02] dark:bg-paper/[0.02] text-[11px] font-mono text-ink/60 dark:text-paper/60 space-y-1">
          <div className="font-semibold text-ink/80 dark:text-paper/80">
            Chunk ID: {citation.chunkId.slice(0, 8)}...
          </div>
          <div>
            Retrieved via hybrid search with Reciprocal Rank Fusion (RRF k=60).
          </div>
        </div>
      </div>
    </aside>
  );
}
