import { useState } from 'react';
import { FileText, Trash2, Sparkles, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { Document } from '@askmynotes/shared';
import { Card } from '@/components/ui/Card';
import { StatusChip } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onStartChat: (id: string) => void;
  onGenerateStudy: (id: string) => void;
}

export function DocumentCard({
  document,
  isSelected,
  onSelect,
  onDelete,
  onStartChat,
  onGenerateStudy,
}: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isReady = document.status === 'ready';
  const isProcessing = document.status === 'queued' || document.status === 'parsing' || document.status === 'embedding';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${document.title}" and all associated embeddings?`)) {
      setIsDeleting(true);
      try {
        await onDelete(document.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Card
      elevated={isSelected}
      padding="none"
      onClick={() => onSelect(document.id)}
      className={`relative overflow-hidden cursor-pointer transition-all duration-180 border select-none ${
        isSelected
          ? 'border-acid ring-2 ring-acid shadow-offset'
          : 'border-ink/15 dark:border-paper/15 hover:border-ink/30 dark:hover:border-paper/30'
      } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* Top Banner with File Info */}
      <div className="p-4 border-b border-ink/10 dark:border-paper/10 bg-paper dark:bg-nightRaised flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-btn bg-acid/20 border border-acid/40 text-forest dark:text-acid flex items-center justify-center shrink-0">
            <FileText size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h4 className="font-heading font-bold text-sm text-ink dark:text-paper truncate" title={document.title}>
              {document.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-ink/50 dark:text-paper/50">
              <span>{formatSize(document.sizeBytes)}</span>
              {document.pageCount && (
                <>
                  <span>·</span>
                  <span>{document.pageCount} pages</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Multi-select checkmark pill */}
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-acid border-ink text-ink font-bold'
              : 'border-ink/20 dark:border-paper/20 hover:border-ink/50'
          }`}
        >
          {isSelected && <Check size={12} strokeWidth={3} />}
        </div>
      </div>

      {/* Body: Status and Ingestion Progress */}
      <div className="p-4 space-y-3 bg-paper dark:bg-night">
        <div className="flex items-center justify-between">
          <StatusChip status={document.status} />
          {isProcessing && (
            <span className="font-mono text-xs font-semibold text-forest dark:text-acid">
              {document.progress}%
            </span>
          )}
        </div>

        {isProcessing && (
          <ProgressBar
            value={document.progress}
            size="sm"
            statusText={
              document.status === 'queued'
                ? 'Waiting in queue...'
                : document.status === 'parsing'
                ? 'Extracting sections...'
                : 'Batch embedding vectors...'
            }
          />
        )}

        {document.status === 'failed' && (
          <div className="text-xs text-danger flex items-center gap-1.5 font-mono">
            <AlertCircle size={12} />
            <span>{document.errorMessage || 'Failed to process document'}</span>
          </div>
        )}

        {/* Quick action buttons if ready */}
        {isReady && (
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-ink/10 dark:border-paper/10">
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(document.id);
                }}
                className="px-2.5 py-1 rounded-btn text-xs font-mono font-medium border border-ink/15 dark:border-paper/15 hover:bg-acid/20 text-ink dark:text-paper flex items-center gap-1.5 transition-colors"
                title="Chat with this document"
              >
                <MessageSquare size={12} />
                <span>Chat</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateStudy(document.id);
                }}
                className="px-2.5 py-1 rounded-btn text-xs font-mono font-medium border border-ink/15 dark:border-paper/15 hover:bg-lilac/20 text-ink dark:text-paper flex items-center gap-1.5 transition-colors"
                title="Generate flashcards & quiz"
              >
                <Sparkles size={12} />
                <span>Study</span>
              </button>
            </div>

            <button
              onClick={handleDelete}
              className="p-1 rounded-btn text-ink/40 dark:text-paper/40 hover:text-danger hover:bg-danger/10 transition-colors"
              title="Delete document"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
