import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Check, X, Sparkles, BookOpen } from 'lucide-react';
import { Flashcard } from '@askmynotes/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface FlashcardsDeckProps {
  cards: Flashcard[];
  documentTitle: string;
  onReviewCard: (id: string, success: boolean) => void;
  onBack: () => void;
}

export function FlashcardsDeck({
  cards,
  documentTitle,
  onReviewCard,
  onBack,
}: FlashcardsDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="font-heading font-bold text-lg text-ink dark:text-paper">
          No flashcards found for this document.
        </p>
        <Button variant="secondary" onClick={onBack}>
          Back to Study Tools
        </Button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = (success: boolean) => {
    onReviewCard(currentCard.id, success);
    setReviewedCount((prev) => prev + 1);
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed deck
      setCurrentIndex(cards.length);
    }
  };

  const isCompleted = currentIndex >= cards.length;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div className="text-xs font-mono font-bold text-forest dark:text-acid">
          {isCompleted ? 'Review Finished' : `Card ${currentIndex + 1} of ${cards.length}`}
        </div>
      </div>

      {!isCompleted ? (
        <>
          {/* Progress Indicator */}
          <div className="w-full h-1.5 bg-ink/10 dark:bg-paper/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-acid transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={handleFlip}
            className="w-full h-72 cursor-pointer perspective-1000 group"
          >
            <div
              className={`relative w-full h-full rounded-card border-2 border-ink dark:border-paper/20 bg-paper dark:bg-nightRaised p-8 flex flex-col justify-between transition-transform duration-300 shadow-offset transform-style-3d ${
                isFlipped ? 'bg-acid/10 border-acid' : ''
              }`}
            >
              <div className="flex justify-between items-center text-xs font-mono text-ink/50 dark:text-paper/50">
                <span className="flex items-center gap-1.5 font-semibold text-forest dark:text-acid">
                  <Sparkles size={13} />
                  <span>{isFlipped ? 'Answer' : 'Question (Active Recall)'}</span>
                </span>
                <span className="text-[11px] underline">Click to flip</span>
              </div>

              <div className="text-center font-heading font-bold text-lg sm:text-xl text-ink dark:text-paper leading-snug px-4">
                {isFlipped ? currentCard.back : currentCard.front}
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono text-ink/40 dark:text-paper/40">
                <span>{documentTitle}</span>
                <RotateCw size={13} className="group-hover:rotate-180 transition-transform duration-300" />
              </div>
            </div>
          </div>

          {/* Review Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => handleNext(false)}
              className="flex-1 py-3 px-4 rounded-btn border border-danger/40 bg-danger/10 hover:bg-danger/20 text-danger text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <X size={16} />
              <span>Again (Needs practice)</span>
            </button>

            <button
              onClick={() => handleNext(true)}
              className="flex-1 py-3 px-4 rounded-btn border border-ink bg-acid hover:brightness-105 text-ink text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shadow-offset-sm active:scale-95"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Got it (Mastered)</span>
            </button>
          </div>
        </>
      ) : (
        /* Completion Screen */
        <Card elevated className="text-center p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/20 text-success border border-success/40 flex items-center justify-center mx-auto">
            <Check size={32} strokeWidth={2.5} />
          </div>

          <div>
            <h3 className="font-heading font-extrabold text-2xl text-ink dark:text-paper">
              Deck Completed!
            </h3>
            <p className="font-body text-xs sm:text-sm text-ink/60 dark:text-paper/60 mt-1">
              You reviewed {cards.length} cards from {documentTitle}. Spaced repetition intervals have been updated.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              Review Again
            </Button>
            <Button variant="primary" size="sm" onClick={onBack}>
              Finish
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
