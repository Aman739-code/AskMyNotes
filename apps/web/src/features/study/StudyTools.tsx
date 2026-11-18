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

  // Fetch available documents
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      try {
        return await api.get<Document[]>('/documents');
      } catch {
        return [
          {
            id: 'doc-demo-1',
            userId: '00000000-0000-0000-0000-000000000001',
            title: 'BIO-201 Cell Biology Lecture Notes.pdf',
            filePath: '',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            pageCount: 24,
            status: 'ready',
            progress: 100,
            errorMessage: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'doc-demo-2',
            userId: '00000000-0000-0000-0000-000000000001',
            title: 'Macroeconomics Chapter 4 & 5.md',
            filePath: '',
            mimeType: 'text/markdown',
            sizeBytes: 850,
            pageCount: 12,
            status: 'ready',
            progress: 100,
            errorMessage: null,
            createdAt: new Date().toISOString(),
          },
        ];
      }
    },
  });

  const activeDocId = selectedDocId || (documents.length > 0 ? documents[0].id : '');
  const currentDoc = documents.find((d) => d.id === activeDocId);

  // Flashcards for current doc
  const [flashcards, setFlashcards] = useState<Flashcard[]>([
    {
      id: 'fc-1',
      documentId: 'doc-demo-1',
      userId: 'user',
      front: 'What is the committed step of glycolysis and which enzyme catalyzes it?',
      back: 'The conversion of fructose-6-phosphate to fructose-1,6-bisphosphate, catalyzed by phosphofructokinase-1 (PFK-1).',
      ease: 2.5,
      dueAt: new Date().toISOString(),
    },
    {
      id: 'fc-2',
      documentId: 'doc-demo-1',
      userId: 'user',
      front: 'What effect does high intracellular ATP concentration have on PFK-1?',
      back: 'High ATP acts as an allosteric inhibitor, binding to regulatory sites to decrease enzyme affinity for substrate.',
      ease: 2.5,
      dueAt: new Date().toISOString(),
    },
    {
      id: 'fc-3',
      documentId: 'doc-demo-1',
      userId: 'user',
      front: 'What is the net generation of ATP per molecule of glucose entering aerobic glycolysis?',
      back: 'A net gain of 2 ATP molecules (4 produced, 2 consumed in investment phase).',
      ease: 2.5,
      dueAt: new Date().toISOString(),
    },
  ]);

  // Quiz questions for current doc
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q-1',
      question: 'Which enzyme catalyzes the rate-limiting step of glycolysis?',
      options: ['Hexokinase', 'Phosphofructokinase-1', 'Pyruvate kinase', 'Aldolase'],
      correctIndex: 1,
      explanation: 'PFK-1 catalyzes the phosphorylation of fructose-6-phosphate, which is the main committed pacemaker step.',
      pageNumber: 14,
    },
    {
      id: 'q-2',
      question: 'Which molecule acts as an allosteric activator of PFK-1?',
      options: ['ATP', 'Citrate', 'Fructose-2,6-bisphosphate', 'Glucose-6-phosphate'],
      correctIndex: 2,
      explanation: 'Fructose-2,6-bisphosphate is the most potent allosteric activator of PFK-1, overcoming ATP inhibition.',
      pageNumber: 16,
    },
    {
      id: 'q-3',
      question: 'Where in the eukaryotic cell does glycolysis take place?',
      options: ['Mitochondrial matrix', 'Cytoplasm / Cytosol', 'Endoplasmic reticulum', 'Inner membrane space'],
      correctIndex: 1,
      explanation: 'Glycolysis is an anaerobic cytosolic process that takes place in the fluid cytoplasm.',
      pageNumber: 8,
    },
  ]);

  const handleGenerateCards = async () => {
    if (!activeDocId) return;
    setIsGeneratingCards(true);
    try {
      const res = await api.post<Flashcard[]>(`/documents/${activeDocId}/flashcards`, { count: 10 });
      if (Array.isArray(res) && res.length > 0) {
        setFlashcards(res);
      }
    } catch {
      // Keep demo flashcards
    } finally {
      setIsGeneratingCards(false);
      setMode('deck');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeDocId) return;
    setIsGeneratingQuiz(true);
    try {
      const res = await api.post<QuizQuestion[]>(`/documents/${activeDocId}/quiz`, { count: 5 });
      if (Array.isArray(res) && res.length > 0) {
        setQuizQuestions(res);
      }
    } catch {
      // Keep demo quiz
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
