import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Sparkles, ArrowRight, RotateCcw, Award } from 'lucide-react';
import { QuizQuestion } from '@askmynotes/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface QuizModalProps {
  questions: QuizQuestion[];
  documentTitle: string;
  onClose: () => void;
}

export function QuizModal({ questions, documentTitle, onClose }: QuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (questions.length === 0) {
    return null;
  }

  const currentQ = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-[100dvh] w-[100vw] flex items-center justify-center p-4 bg-ink/75 dark:bg-black/85 backdrop-blur-sm select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <Card elevated className="relative z-[101] w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 bg-paper dark:bg-nightRaised">
        {!isFinished ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink/10 dark:border-paper/10 pb-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-forest dark:text-acid font-semibold">
                  Knowledge Check · {documentTitle}
                </span>
                <div className="text-xs font-mono text-ink/60 dark:text-paper/60 mt-0.5">
                  Question {currentIndex + 1} of {questions.length}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-acid/20 text-forest dark:text-acid px-2.5 py-1 rounded-full">
                  Score: {score}
                </span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-btn hover:bg-ink/5 dark:hover:bg-paper/5 text-ink/50"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-ink dark:text-paper leading-snug">
                {currentQ.question}
              </h3>
              {currentQ.pageNumber && (
                <span className="inline-block chip-lilac text-[11px]">
                  Reference: Page {currentQ.pageNumber}
                </span>
              )}
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((option: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctIndex;
                let optionClasses = 'border-ink/15 dark:border-paper/15 hover:border-ink/40 bg-paper dark:bg-night';

                if (isAnswered) {
                  if (isCorrect) {
                    optionClasses = 'border-success bg-success/10 text-success font-semibold';
                  } else if (isSelected) {
                    optionClasses = 'border-danger bg-danger/10 text-danger';
                  } else {
                    optionClasses = 'opacity-40 border-ink/10';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left p-3.5 rounded-btn border text-xs sm:text-sm flex items-center justify-between transition-all select-none ${optionClasses}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center font-mono text-xs shrink-0 font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {isAnswered && isCorrect && <Check size={16} className="text-success shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <X size={16} className="text-danger shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation when answered */}
            {isAnswered && (
              <div className="p-4 rounded-card bg-ink/[0.03] dark:bg-paper/[0.03] border border-ink/10 dark:border-paper/10 text-xs text-ink/80 dark:text-paper/80 space-y-1 animate-slide-up">
                <div className="font-bold flex items-center gap-1.5 text-forest dark:text-acid">
                  <Sparkles size={13} />
                  <span>Explanation</span>
                </div>
                <p className="leading-relaxed">{currentQ.explanation}</p>
              </div>
            )}

            {/* Next Button */}
            {isAnswered && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleNext}
                  rightIcon={<ArrowRight size={14} />}
                >
                  {currentIndex === questions.length - 1 ? 'See Results' : 'Next Question'}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Final Results Score Screen */
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-acid border border-ink text-ink flex items-center justify-center mx-auto shadow-offset">
              <Award size={32} strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="font-heading font-black text-2xl text-ink dark:text-paper">
                Quiz Complete!
              </h3>
              <p className="font-body text-sm text-ink/60 dark:text-paper/60 mt-1">
                You scored <strong className="text-forest dark:text-acid font-bold font-mono text-base">{score} / {questions.length}</strong> ({Math.round((score / questions.length) * 100)}%) on {documentTitle}.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRestart}
                leftIcon={<RotateCcw size={14} />}
              >
                Retake Quiz
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Back to Study
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>,
    document.body,
  );
}
