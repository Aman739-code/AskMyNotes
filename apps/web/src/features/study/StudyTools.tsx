import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, BookOpen, Layers, Award, Loader2 } from 'lucide-react';
import { Document, Flashcard, QuizQuestion } from '@askmynotes/shared';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FlashcardsDeck } from './FlashcardsDeck';
import { QuizModal } from './QuizModal';

export function StudyTools() {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('doc');

  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || '');
  const [mode, setMode] = useState<'hub' | 'deck' | 'quiz'>('hub');
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);

  // Fetch available documents
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      return api.get<Document[]>('/documents');
    },
  });

  const activeDocId = selectedDocId || (documents.length > 0 ? documents[0].id : '');
  const currentDoc = documents.find((d) => d.id === activeDocId);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const handleGenerateCards = async () => {
    if (!activeDocId) return;
    setIsGeneratingCards(true);
    setStudyError(null);
    try {
      const res = await api.post<Flashcard[]>(`/documents/${activeDocId}/flashcards`, { count: 10 });
      if (Array.isArray(res) && res.length > 0) {
        setFlashcards(res);
      }
    } catch (err: unknown) {
      setFlashcards([]);
      setStudyError(
        err instanceof Error
          ? `Could not generate flashcards: ${err.message}`
          : 'Could not generate flashcards. Check that the document has finished processing and try again.',
      );
    } finally {
      setIsGeneratingCards(false);
      setMode('deck');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeDocId) return;
    setIsGeneratingQuiz(true);
    setStudyError(null);
    try {
      const res = await api.post<QuizQuestion[]>(`/documents/${activeDocId}/quiz`, { count: 5 });
      if (Array.isArray(res) && res.length > 0) {
        setQuizQuestions(res);
      }
    } catch (err: unknown) {
      setQuizQuestions([]);
      setStudyError(
        err instanceof Error
          ? `Could not generate the quiz: ${err.message}`
          : 'Could not generate the quiz. Check that the document has finished processing and try again.',
      );
    } finally {
      setIsGeneratingQuiz(false);
      setMode('quiz');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="border-b border-ink/10 dark:border-paper/10 pb-6">
        <span className="font-mono text-xs uppercase tracking-wider text-forest dark:text-acid font-semibold">
          Active Recall & Spaced Repetition
        </span>
        <h1 className="font-heading text-3xl font-extrabold text-ink dark:text-paper tracking-tight mt-0.5">
          Study Tools
        </h1>
        <p className="font-body text-xs sm:text-sm text-ink/60 dark:text-paper/60 mt-1">
          Generate spaced repetition flashcards and test yourself with multi-choice quizzes generated directly from your uploaded materials.
        </p>
      </div>

      {mode === 'hub' && (
        <div className="space-y-8">
          {studyError && (
            <div className="rounded-card border border-danger/30 bg-danger/[0.08] p-4 text-sm text-danger">
              {studyError}
            </div>
          )}
          {/* Document Picker */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase tracking-wider text-ink/60 dark:text-paper/60 font-semibold">
              Select Study Material:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const isSelected = doc.id === activeDocId;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-4 rounded-card border text-left transition-all ${
                      isSelected
                        ? 'border-acid bg-acid/15 ring-2 ring-acid shadow-offset-sm'
                        : 'border-ink/15 dark:border-paper/15 hover:border-ink/30 bg-paper dark:bg-nightRaised'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={16} className="text-forest dark:text-acid" />
                      <span className="font-mono text-[11px] text-ink/50 dark:text-paper/50">
                        {doc.pageCount || 10} pages
                      </span>
                    </div>
                    <div className="font-heading font-bold text-sm text-ink dark:text-paper truncate">
                      {doc.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Flashcards Generator */}
            <Card elevated padding="lg" className="space-y-4 border border-ink/20 dark:border-paper/20">
              <div className="w-10 h-10 rounded-btn bg-acid/20 border border-acid/50 text-forest dark:text-acid flex items-center justify-center">
                <Sparkles size={20} strokeWidth={2} />
              </div>

              <div>
                <h3 className="font-heading font-bold text-xl text-ink dark:text-paper">
                  Spaced Repetition Deck
                </h3>
                <p className="font-body text-xs sm:text-sm text-ink/60 dark:text-paper/60 mt-1 leading-relaxed">
                  Extracts core terms, definitions, and relationships into a deck with 3D flip review and "Again / Got it" ease tracking.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleGenerateCards}
                  isLoading={isGeneratingCards}
                  leftIcon={<Sparkles size={14} />}
                >
                  Generate Flashcards
                </Button>
                {flashcards.length > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setMode('deck')}
                  >
                    Review Deck ({flashcards.length})
                  </Button>
                )}
              </div>
            </Card>

            {/* Quiz Generator */}
            <Card elevated padding="lg" className="space-y-4 border border-ink/20 dark:border-paper/20">
              <div className="w-10 h-10 rounded-btn bg-lilac/25 border border-lilac text-lilac flex items-center justify-center">
                <Award size={20} strokeWidth={2} />
              </div>

              <div>
                <h3 className="font-heading font-bold text-xl text-ink dark:text-paper">
                  5-Question Practice Quiz
                </h3>
                <p className="font-body text-xs sm:text-sm text-ink/60 dark:text-paper/60 mt-1 leading-relaxed">
                  Generates multiple-choice exam questions with page-number citations, instant feedback, and detailed explanations.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleGenerateQuiz}
                  isLoading={isGeneratingQuiz}
                  leftIcon={<Award size={14} />}
                >
                  Generate Quiz
                </Button>
                {quizQuestions.length > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setMode('quiz')}
                  >
                    Take Quiz ({quizQuestions.length} Qs)
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Active Deck Mode */}
      {mode === 'deck' && (
        <FlashcardsDeck
          cards={flashcards}
          documentTitle={currentDoc?.title || 'Document'}
          onReviewCard={(id, success) => {
            console.log('Card reviewed:', id, success);
          }}
          onBack={() => setMode('hub')}
        />
      )}

      {/* Active Quiz Mode */}
      {mode === 'quiz' && (
        <QuizModal
          questions={quizQuestions}
          documentTitle={currentDoc?.title || 'Document'}
          onClose={() => setMode('hub')}
        />
      )}
    </div>
  );
}
