import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Sparkles, Filter, AlertTriangle, Layers, BookOpen, Clock, ChevronDown } from 'lucide-react';
import { Document, Message, Citation } from '@askmynotes/shared';
import { api, ApiError } from '@/lib/api';
import { MessageList } from './MessageList';
import { CitationViewer } from './CitationViewer';
import { Card } from '@/components/ui/Card';

export function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [inputMessage, setInputMessage] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ message: string; retryAfter: number } | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => {
    const docQuery = searchParams.get('docs');
    return docQuery ? docQuery.split(',').filter(Boolean) : [];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available documents for scope selection
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      return api.get<Document[]>('/documents');
    },
  });

  // Fetch conversation messages
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return api.get<Message[]>(`/conversations/${conversationId}/messages`);
    },
    enabled: !!conversationId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Rate limit countdown effect
  useEffect(() => {
    if (!rateLimitInfo || rateLimitInfo.retryAfter <= 0) return;
    const interval = setInterval(() => {
      setRateLimitInfo((prev) => {
        if (!prev || prev.retryAfter <= 1) return null;
        return { ...prev, retryAfter: prev.retryAfter - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitInfo]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputMessage.trim();
    if (!prompt || isStreaming) return;

    setInputMessage('');
    setIsStreaming(true);
    setStreamingText('');
    setRateLimitInfo(null);
    setChatError(null);

    // Optimistically add user message to list or state
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId || 'new',
      userId: 'user',
      role: 'user',
      content: prompt,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    // Store collected citations for the answer
    const streamCitations: Citation[] = [];

    try {
      const abortController = api.streamSSE(
        '/chat',
        {
          message: prompt,
          conversationId,
          documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        },
        {
          onToken: (token) => {
            setStreamingText((prev) => prev + token);
          },
          onCitation: (citation) => {
            streamCitations.push(citation as Citation);
            if (!activeCitation) {
              setActiveCitation(citation as Citation);
            }
          },
          onDone: ({ conversationId: newConvId }) => {
            setIsStreaming(false);
            setStreamingText('');
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            if (!conversationId && newConvId) {
              navigate(`/app/chat/${newConvId}`, { replace: true });
            } else {
              refetchMessages();
            }
          },
          onError: (errMsg) => {
            setIsStreaming(false);
            if (errMsg.includes('rate_limit') || errMsg.includes('Too many requests')) {
              setRateLimitInfo({
                message: 'You have reached your free tier chat request limit.',
                retryAfter: 45,
              });
            } else {
              setChatError(errMsg || 'The chat request failed.');
            }
          },
        },
      );
    } catch (err: any) {
      setIsStreaming(false);
      if (err instanceof ApiError && err.isRateLimited) {
        setRateLimitInfo({
          message: err.message,
          retryAfter: err.retryAfterSeconds || 60,
        });
      } else {
        setChatError('The chat request failed.');
      }
    }
  };


  const handleSuggestionClick = (query: string) => {
    setInputMessage(query);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Pane: Document Scope Selector (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-ink/10 dark:border-paper/10 bg-paper dark:bg-nightRaised p-4 shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink/70 dark:text-paper/70 uppercase tracking-wider mb-3">
          <Layers size={14} />
          <span>Retrieval Scope</span>
        </div>

        <p className="text-[11px] font-body text-ink/50 dark:text-paper/50 mb-3">
          Choose which materials the hybrid search queries against:
        </p>

        <div className="space-y-1.5 flex-1 overflow-y-auto">
          <button
            onClick={() => setSelectedDocIds([])}
            className={`w-full text-left px-3 py-2 rounded-btn text-xs font-medium transition-colors flex items-center justify-between ${
              selectedDocIds.length === 0
                ? 'bg-acid/20 text-forest dark:text-acid font-bold border border-acid/40'
                : 'text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5'
            }`}
          >
            <span>All Documents</span>
            <span className="font-mono text-[10px] bg-ink/5 dark:bg-paper/10 px-1.5 py-0.5 rounded">
              {documents.length}
            </span>
          </button>

          {documents.map((doc) => {
            const isChecked = selectedDocIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDocIds((prev) =>
                    prev.includes(doc.id) ? prev.filter((id) => id !== doc.id) : [...prev, doc.id],
                  );
                }}
                className={`w-full text-left px-3 py-2 rounded-btn text-xs transition-colors flex items-center gap-2 truncate ${
                  isChecked
                    ? 'bg-acid/20 text-forest dark:text-acid font-medium border border-acid/30'
                    : 'text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5'
                }`}
              >
                <BookOpen size={13} className="shrink-0 opacity-60" />
                <span className="truncate">{doc.title}</span>
              </button>
            );
          })}
        </div>

        {selectedDocIds.length > 0 && (
          <div className="pt-3 border-t border-ink/10 dark:border-paper/10">
            <button
              onClick={() => setSelectedDocIds([])}
              className="text-xs font-mono text-ink/50 dark:text-paper/50 hover:text-ink dark:hover:text-paper underline"
            >
              Reset to all documents
            </button>
          </div>
        )}
      </aside>

      {/* Center Pane: Main Conversation Stream */}
      <div className="flex-1 flex flex-col h-full bg-paper dark:bg-night overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Rate Limit Alert */}
          {rateLimitInfo && (
            <div className="p-4 rounded-card bg-tangerine/15 border border-tangerine/40 text-tangerine text-xs sm:text-sm flex items-start gap-3 animate-slide-up">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">{rateLimitInfo.message}</div>
                <div className="font-mono text-xs flex items-center gap-1.5 opacity-90">
                  <Clock size={12} />
                  <span>Available again in {rateLimitInfo.retryAfter}s</span>
                </div>
              </div>
            </div>
          )}

          {chatError && (
            <div className="p-4 rounded-card bg-danger/10 border border-danger/30 text-danger text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="font-bold">{chatError}</div>
            </div>
          )}

          {/* Empty Conversation Suggestions */}
          {messages.length === 0 && !isStreaming && (
            <div className="py-12 max-w-lg mx-auto text-center space-y-6">
              <div className="w-12 h-12 rounded-btn bg-acid/20 border border-acid/40 text-forest dark:text-acid flex items-center justify-center mx-auto shadow-offset-sm">
                <Sparkles size={22} strokeWidth={2} />
              </div>

              <div>
                <h3 className="font-heading font-extrabold text-2xl text-ink dark:text-paper">
                  Ask your study notes
                </h3>
                <p className="font-body text-xs sm:text-sm text-ink/60 dark:text-paper/60 mt-1 max-w-sm mx-auto">
                  Every answer is retrieved from your material with exact page citations and zero hallucination.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink/40 dark:text-paper/40 px-1">
                  Try asking:
                </div>
                {[
                  'What are the key concepts and formulas covered in this chapter?',
                  'Summarize the mechanism of action described on page 12',
                  'Explain the differences between competitive and non-competitive inhibition',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-3 rounded-card border border-ink/10 dark:border-paper/10 bg-paper dark:bg-nightRaised hover:border-acid text-xs text-ink/80 dark:text-paper/80 hover:bg-acid/5 transition-all select-none shadow-xs"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render Messages */}
          <MessageList
            messages={messages}
            streamingText={streamingText}
            isStreaming={isStreaming}
            onCitationClick={(cite) => setActiveCitation(cite)}
          />

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Form */}
        <div className="p-4 border-t border-ink/10 dark:border-paper/10 bg-paper dark:bg-night select-none">
          <form
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto flex items-center gap-2 relative"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  selectedDocIds.length > 0
                    ? `Ask about ${selectedDocIds.length} selected document(s)...`
                    : 'Ask anything across all your uploaded notes...'
                }
                disabled={isStreaming || !!rateLimitInfo}
                className="input pr-12 text-sm py-3"
              />
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim() || isStreaming || !!rateLimitInfo}
              className="btn-primary py-3 px-4 shrink-0 flex items-center justify-center disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          </form>

          <div className="max-w-4xl mx-auto flex items-center justify-between mt-2 text-[11px] font-mono text-ink/40 dark:text-paper/40 px-1">
            <span>Powered by Gemini & pgvector HNSW</span>
            <span>Click any citation chip to view source passage</span>
          </div>
        </div>
      </div>

      {/* Right Pane: Citation Inspector (Desktop & Mobile Slide-in) */}
      {activeCitation && (
        <CitationViewer
          citation={activeCitation}
          onClose={() => setActiveCitation(null)}
        />
      )}
    </div>
  );
}
