import { useState } from 'react';
import { ArrowRight, BookOpen, Sparkles, Shield, Zap, CheckCircle2, FileText, Layers, Search, CornerDownLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { supabase } from '@/lib/supabase';

interface LandingPageProps {
  onSignInSuccess?: () => void;
}

export function LandingPage({ onSignInSuccess }: LandingPageProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'cards'>('chat');

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      // In production, redirects to Google via Supabase OAuth
      if (supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) {
          console.warn('OAuth redirect initiated or demo fallback:', error.message);
        }
      }
      onSignInSuccess?.();
    } catch (err) {
      console.error('Sign-in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-night text-ink dark:text-paper selection:bg-acid selection:text-ink transition-colors duration-180">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-ink/10 dark:border-paper/10 bg-paper/90 dark:bg-night/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-btn bg-ink dark:bg-paper flex items-center justify-center border border-ink shadow-offset-sm">
              <span className="font-heading font-black text-acid dark:text-night text-lg tracking-tight">A</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-ink dark:text-paper">
              AskMyNotes
            </span>
            <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-ink/5 dark:bg-paper/10 border border-ink/10 dark:border-paper/15 text-ink/70 dark:text-paper/70 ml-1">
              v1.0 free tier
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="primary"
              size="sm"
              onClick={handleGoogleSignIn}
              isLoading={isSigningIn}
              rightIcon={<ArrowRight size={14} strokeWidth={2} />}
            >
              Sign in with Google
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Editorial Value Proposition */}
          <div className="lg:col-span-7 flex flex-col items-start pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ink/15 dark:border-paper/15 bg-ink/5 dark:bg-paper/5 text-xs font-mono mb-6">
              <span className="w-2 h-2 rounded-full bg-acid animate-pulse" />
              <span>Hybrid retrieval · Exact page citations</span>
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl font-extrabold tracking-tight text-ink dark:text-paper leading-[1.08] mb-6">
              Your notes have answers. <br />
              <span className="text-forest dark:text-acid underline decoration-acid decoration-4 underline-offset-4">
                Stop skimming.
              </span>
            </h1>

            <p className="font-body text-lg sm:text-xl text-ink/70 dark:text-paper/70 leading-relaxed mb-8 max-w-xl">
              Drop lecture slides, PDFs, or handwritten notes. Ask questions across your entire semester. Get streamed answers with click-to-verify page citations and auto-generated quizzes.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-6">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGoogleSignIn}
                isLoading={isSigningIn}
                rightIcon={<ArrowRight size={18} strokeWidth={2} />}
                className="w-full sm:w-auto text-base"
              >
                Continue with Google
              </Button>
              <div className="flex items-center gap-2 text-xs font-mono text-ink/60 dark:text-paper/60 px-3 py-2">
                <span>Free tier</span>
                <span>·</span>
                <span>No credit card</span>
                <span>·</span>
                <span>Instant access</span>
              </div>
            </div>

            {/* Quick Proof Pills */}
            <div className="pt-6 border-t border-ink/10 dark:border-paper/10 w-full flex flex-wrap gap-3">
              <Chip variant="acid">HNSW Vector + Full-Text Search</Chip>
              <Chip variant="lilac">Reciprocal Rank Fusion</Chip>
              <Chip variant="tangerine">No Hallucinations Guarantee</Chip>
            </div>
          </div>

          {/* Right Column: Live Product Mock (Interactive, CSS-crafted, not stock image) */}
          <div className="lg:col-span-5 w-full">
            <Card elevated padding="none" className="overflow-hidden border-2 border-ink dark:border-paper/20 bg-paper dark:bg-nightRaised">
              {/* Window Title Bar */}
              <div className="px-4 py-3 border-b border-ink/15 dark:border-paper/15 bg-ink/[0.03] dark:bg-paper/[0.03] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-tangerine/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-acid/80" />
                  <span className="font-mono text-xs text-ink/60 dark:text-paper/60 ml-2">
                    BIO-201_Cell_Biology_Final.pdf
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-2 py-0.5 text-xs font-mono rounded ${activeTab === 'chat' ? 'bg-ink text-paper dark:bg-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60'}`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('cards')}
                    className={`px-2 py-0.5 text-xs font-mono rounded ${activeTab === 'cards' ? 'bg-ink text-paper dark:bg-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60'}`}
                  >
                    Cards
                  </button>
                </div>
              </div>

              {/* Mock Viewport */}
              <div className="p-5 font-body text-sm space-y-4 min-h-[380px] flex flex-col justify-between bg-grid">
                {activeTab === 'chat' ? (
                  <>
                    <div className="space-y-4">
                      {/* User Query */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-card p-3 bg-ink text-paper dark:bg-paper dark:text-ink shadow-sm text-sm">
                          What is the rate-limiting enzyme of glycolysis and how is it allosterically regulated?
                        </div>
                      </div>

                      {/* Assistant Streamed Answer with Citations */}
                      <div className="flex justify-start">
                        <div className="max-w-[95%] rounded-card p-4 bg-paper dark:bg-night border border-ink/15 dark:border-paper/15 shadow-sm space-y-2">
                          <div className="flex items-center gap-2 text-xs font-mono text-forest dark:text-acid font-semibold">
                            <Sparkles size={13} strokeWidth={2} />
                            <span>AskMyNotes · Answer</span>
                          </div>
                          <p className="text-ink dark:text-paper leading-relaxed text-[13.5px]">
                            The rate-limiting enzyme of glycolysis is <strong>phosphofructokinase-1 (PFK-1)</strong>. It catalyzes the phosphorylation of fructose-6-phosphate to fructose-1,6-bisphosphate.
                          </p>
                          <div className="text-[13px] text-ink/80 dark:text-paper/80 pt-1">
                            <strong>Allosteric Regulators:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              <li>Inhibited by high <span className="font-mono">ATP</span> and citrate</li>
                              <li>Activated by <span className="font-mono">AMP</span> and fructose-2,6-bisphosphate</li>
                            </ul>
                          </div>

                          {/* Citation Chips */}
                          <div className="pt-2 flex flex-wrap gap-2 border-t border-ink/10 dark:border-paper/10 mt-2">
                            <span className="chip-lilac cursor-pointer hover:bg-lilac/30 transition-colors">
                              [p. 14 · Glycolysis Regulation]
                            </span>
                            <span className="chip-acid cursor-pointer hover:bg-acid/30 transition-colors">
                              [p. 16 · Allosteric Effectors]
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mock Input Bar */}
                    <div className="pt-3">
                      <div className="flex items-center gap-2 p-2 rounded-btn border border-ink/20 dark:border-paper/20 bg-paper dark:bg-night">
                        <input
                          type="text"
                          readOnly
                          value="Why does high ATP inhibit PFK-1?"
                          className="w-full bg-transparent text-xs text-ink/70 dark:text-paper/70 outline-none"
                        />
                        <button className="p-1.5 rounded-btn bg-acid text-ink font-bold hover:brightness-105">
                          <CornerDownLeft size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Mock Flashcard Review */
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="w-full h-48 rounded-card border-2 border-ink dark:border-paper/20 bg-paper dark:bg-night p-6 flex flex-col justify-between shadow-offset-sm">
                      <div className="flex justify-between items-center text-xs font-mono text-ink/50 dark:text-paper/50">
                        <span>Card 3 of 12</span>
                        <span className="chip-acid">Active Recall</span>
                      </div>
                      <div className="text-center font-heading font-bold text-base text-ink dark:text-paper">
                        "What is the net yield of ATP and NADH per glucose molecule in glycolysis?"
                      </div>
                      <div className="text-center text-xs font-mono text-ink/40 dark:text-paper/40">
                        Tap space to flip card
                      </div>
                    </div>
                    <div className="flex gap-3 w-full">
                      <button className="flex-1 py-2 rounded-btn border border-danger/40 text-danger text-xs font-mono hover:bg-danger/10">
                        Again (1d)
                      </button>
                      <button className="flex-1 py-2 rounded-btn bg-acid text-ink text-xs font-mono font-bold border border-ink">
                        Got It (4d)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* 3-Step "How It Works" Section */}
        <section className="mt-28">
          <div className="mb-12">
            <span className="font-mono text-xs uppercase tracking-wider text-forest dark:text-acid font-semibold">
              01 — Process
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-ink dark:text-paper mt-1">
              How AskMyNotes Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card elevated padding="lg" className="border border-ink/20 dark:border-paper/20">
              <div className="font-heading text-4xl font-black text-ink/20 dark:text-paper/20 mb-4">
                01
              </div>
              <div className="w-10 h-10 rounded-btn bg-acid/20 border border-acid text-forest dark:text-acid flex items-center justify-center mb-4">
                <FileText size={20} strokeWidth={2} />
              </div>
              <h3 className="font-heading text-xl font-bold text-ink dark:text-paper mb-2">
                Drop your notes
              </h3>
              <p className="font-body text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                Upload PDFs, Markdown, or lecture slides up to 10 MB. Ingestion extracts text, preserves page numbers, and embeds vectors asynchronously with BullMQ.
              </p>
            </Card>

            <Card elevated padding="lg" className="border border-ink/20 dark:border-paper/20">
              <div className="font-heading text-4xl font-black text-ink/20 dark:text-paper/20 mb-4">
                02
              </div>
              <div className="w-10 h-10 rounded-btn bg-lilac/20 border border-lilac text-lilac flex items-center justify-center mb-4">
                <Search size={20} strokeWidth={2} />
              </div>
              <h3 className="font-heading text-xl font-bold text-ink dark:text-paper mb-2">
                Hybrid Search & RRF
              </h3>
              <p className="font-body text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                Your question triggers pgvector cosine similarity alongside Postgres full-text keyword search. Reciprocal Rank Fusion merges both for zero-miss retrieval.
              </p>
            </Card>

            <Card elevated padding="lg" className="border border-ink/20 dark:border-paper/20">
              <div className="font-heading text-4xl font-black text-ink/20 dark:text-paper/20 mb-4">
                03
              </div>
              <div className="w-10 h-10 rounded-btn bg-tangerine/20 border border-tangerine text-tangerine flex items-center justify-center mb-4">
                <Layers size={20} strokeWidth={2} />
              </div>
              <h3 className="font-heading text-xl font-bold text-ink dark:text-paper mb-2">
                Streamed, Cited Answers
              </h3>
              <p className="font-body text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                The LLM streams answers constrained to your source text. Every assertion links directly to the page chunk in your document. No hallucinations.
              </p>
            </Card>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mt-28">
          <div className="mb-12">
            <span className="font-mono text-xs uppercase tracking-wider text-forest dark:text-acid font-semibold">
              02 — Capabilities
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-ink dark:text-paper mt-1">
              Engineered for Real Study Workloads
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-card border border-ink/15 dark:border-paper/15 bg-paper dark:bg-nightRaised space-y-3">
              <div className="w-8 h-8 rounded-btn bg-acid/30 text-ink dark:text-paper flex items-center justify-center font-bold">
                <BookOpen size={16} strokeWidth={2} />
              </div>
              <h4 className="font-heading text-lg font-bold text-ink dark:text-paper">
                Clickable Page Citations
              </h4>
              <p className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                Every answer references chunk IDs. Click any citation chip to slide open the exact original page passage with highlight.
              </p>
            </div>

            <div className="p-6 rounded-card border border-ink/15 dark:border-paper/15 bg-paper dark:bg-nightRaised space-y-3">
              <div className="w-8 h-8 rounded-btn bg-lilac/30 text-ink dark:text-paper flex items-center justify-center font-bold">
                <Sparkles size={16} strokeWidth={2} />
              </div>
              <h4 className="font-heading text-lg font-bold text-ink dark:text-paper">
                Active Recall Flashcards & Quiz
              </h4>
              <p className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                Instantly turn any lecture slide into a 10-card spaced repetition deck or a 5-question multiple choice quiz with answer explanations.
              </p>
            </div>

            <div className="p-6 rounded-card border border-ink/15 dark:border-paper/15 bg-paper dark:bg-nightRaised space-y-3">
              <div className="w-8 h-8 rounded-btn bg-tangerine/30 text-ink dark:text-paper flex items-center justify-center font-bold">
                <Shield size={16} strokeWidth={2} />
              </div>
              <h4 className="font-heading text-lg font-bold text-ink dark:text-paper">
                Multi-Tenant RLS Security
              </h4>
              <p className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                Supabase Postgres Row Level Security is enforced on all tables and storage buckets. User A can never read User B's files or chunks.
              </p>
            </div>

            <div className="p-6 rounded-card border border-ink/15 dark:border-paper/15 bg-paper dark:bg-nightRaised space-y-3">
              <div className="w-8 h-8 rounded-btn bg-ink/10 dark:bg-paper/10 text-ink dark:text-paper flex items-center justify-center font-bold">
                <Zap size={16} strokeWidth={2} />
              </div>
              <h4 className="font-heading text-lg font-bold text-ink dark:text-paper">
                Idempotent Background Ingestion
              </h4>
              <p className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                BullMQ worker handles chunking and batch embedding with SHA-256 deduplication. Re-running a job never duplicates chunks.
              </p>
            </div>

            <div className="p-6 rounded-card border border-ink/15 dark:border-paper/15 bg-paper dark:bg-nightRaised space-y-3">
              <div className="w-8 h-8 rounded-btn bg-acid/30 text-ink dark:text-paper flex items-center justify-center font-bold">
                <CheckCircle2 size={16} strokeWidth={2} />
              </div>
              <h4 className="font-heading text-lg font-bold text-ink dark:text-paper">
                Sliding-Window Rate Limiting
              </h4>
              <p className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                Protects free-tier API quotas using Upstash Redis. Smooth countdown messages in the UI if rate limits are reached.
              </p>
            </div>

            <div className="p-6 rounded-card border border-ink/15 dark:border-paper/15 bg-paper dark:bg-nightRaised space-y-3">
              <div className="w-8 h-8 rounded-btn bg-lilac/30 text-ink dark:text-paper flex items-center justify-center font-bold">
                <Layers size={16} strokeWidth={2} />
              </div>
              <h4 className="font-heading text-lg font-bold text-ink dark:text-paper">
                Multi-Doc Scope Selection
              </h4>
              <p className="text-sm text-ink/70 dark:text-paper/70 leading-relaxed">
                Ask across all uploaded documents or check a specific subset of chapters to focus your retrieval scope.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="mt-28">
          <Card elevated padding="lg" className="border-2 border-ink dark:border-paper/20 bg-forest text-paper p-8 sm:p-12 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-6">
              <h3 className="font-heading text-3xl sm:text-4xl font-black text-paper leading-tight">
                Ready to study smarter for your next exam?
              </h3>
              <p className="font-body text-base text-paper/80 leading-relaxed">
                Upload your notes in 10 seconds. Completely free on Google Gemini and Supabase free tiers.
              </p>
              <div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  isLoading={isSigningIn}
                  rightIcon={<ArrowRight size={18} strokeWidth={2} />}
                >
                  Start Studying Now
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink/10 dark:border-paper/10 py-10 bg-paper dark:bg-night">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-ink/60 dark:text-paper/60">
          <div>
            AskMyNotes — Built for students who actually study.
          </div>
          <div className="flex gap-6">
            <span>TypeScript Strict</span>
            <span>·</span>
            <span>pgvector HNSW</span>
            <span>·</span>
            <span>BullMQ</span>
            <span>·</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
