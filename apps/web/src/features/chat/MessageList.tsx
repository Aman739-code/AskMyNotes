import { Message, Citation } from '@askmynotes/shared';
import { User as UserIcon, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  onCitationClick: (citation: Citation) => void;
}

export function MessageList({
  messages,
  streamingText,
  isStreaming,
  onCitationClick,
}: MessageListProps) {
  // Renders message content and parses citation tags like [p.14 · bio.pdf] or {{cite:index}}
  const renderFormattedContent = (content: string, citations?: Citation[] | null) => {
    const parts = content.split(/(\[p\.\d+[^\]]*\])/g);

    return (
      <div className="chat-markdown space-y-2 text-sm leading-relaxed text-ink dark:text-paper font-body">
        {parts.map((part, i) => {
          const match = part.match(/\[p\.(\d+)([^\]]*)\]/);
          if (match && citations && citations.length > 0) {
            const pageNum = parseInt(match[1], 10);
            const matchingCitation = citations.find((c) => c.pageNumber === pageNum) || citations[0];
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCitationClick(matchingCitation)}
                className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full text-xs font-mono font-medium bg-lilac/25 text-ink dark:text-lilac border border-lilac/30 hover:bg-lilac/40 hover:scale-105 active:scale-95 transition-all select-none"
              >
                <span>{part}</span>
              </button>
            );
          }
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 ml-5 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal space-y-1">{children}</ol>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
                code: ({ children }) => (
                  <code className="rounded bg-ink/[0.08] px-1 py-0.5 font-mono text-[0.9em] dark:bg-paper/[0.10]">
                    {children}
                  </code>
                ),
                h1: ({ children }) => <h1 className="mt-3 mb-2 text-lg font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="mt-3 mb-2 text-base font-bold">{children}</h2>,
                h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-bold">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="my-2 border-l-2 border-acid pl-3 text-ink/80 dark:text-paper/80">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {part}
            </ReactMarkdown>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {messages.map((message) => {
        const isUser = message.role === 'user';
        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-btn bg-acid/30 text-forest dark:text-acid flex items-center justify-center shrink-0 border border-acid/50 mt-1">
                <Sparkles size={16} strokeWidth={2} />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-card p-4 transition-all ${
                isUser
                  ? 'bg-ink text-paper dark:bg-paper dark:text-ink shadow-offset-sm'
                  : 'bg-paper dark:bg-night border border-ink/15 dark:border-paper/15 shadow-sm space-y-3'
              }`}
            >
              {isUser ? (
                <div className="text-sm font-body leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs font-mono text-forest dark:text-acid font-semibold border-b border-ink/10 dark:border-paper/10 pb-2">
                    <span>AskMyNotes · Verified from Notes</span>
                  </div>

                  {renderFormattedContent(message.content, message.citations)}

                  {message.citations && message.citations.length > 0 && (
                    <div className="pt-2 border-t border-ink/10 dark:border-paper/10 flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-mono text-ink/50 dark:text-paper/50 self-center mr-1">
                        Sources:
                      </span>
                      {message.citations.map((cite: Citation, idx: number) => (
                        <button
                          key={cite.chunkId || idx}
                          type="button"
                          onClick={() => onCitationClick(cite)}
                          className="chip-lilac hover:bg-lilac/30 cursor-pointer transition-colors"
                        >
                          [p.{cite.pageNumber || 1} · {cite.documentTitle.slice(0, 15)}...]
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {isUser && (
              <div className="w-8 h-8 rounded-full bg-ink/10 dark:bg-paper/20 flex items-center justify-center shrink-0 mt-1 text-ink dark:text-paper font-bold text-xs">
                <UserIcon size={14} />
              </div>
            )}
          </div>
        );
      })}

      {/* Live Streaming Response with Soft Caret */}
      {isStreaming && (
        <div className="flex gap-3 justify-start animate-fade-in">
          <div className="w-8 h-8 rounded-btn bg-acid/30 text-forest dark:text-acid flex items-center justify-center shrink-0 border border-acid/50 mt-1 animate-pulse">
            <Sparkles size={16} strokeWidth={2} />
          </div>

          <div className="max-w-[85%] sm:max-w-[75%] rounded-card p-4 bg-paper dark:bg-night border border-ink/15 dark:border-paper/15 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-forest dark:text-acid font-semibold border-b border-ink/10 dark:border-paper/10 pb-2">
              <span className="w-2 h-2 rounded-full bg-acid animate-ping" />
              <span>Synthesizing from your notes...</span>
            </div>

            {streamingText ? (
              <div className="stream-caret">{renderFormattedContent(streamingText)}</div>
            ) : (
              <div className="text-sm font-body leading-relaxed text-ink dark:text-paper stream-caret">
                Searching and ranking retrieved chunks...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
