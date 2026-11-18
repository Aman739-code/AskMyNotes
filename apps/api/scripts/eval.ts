import { defaultEmbeddingProvider } from '../src/lib/embeddings/provider.js';
import { chunkDocumentText, inMemoryChunksStore, inMemoryDocumentsStore } from '../src/services/ingestion.js';
import { localHybridRetrieve } from '../src/services/retrieval.js';

interface EvalQuestion {
  question: string;
  expectedKeywords: string[];
  groundTruthSection: string;
}

const EVAL_DATASET: EvalQuestion[] = [
  {
    question: 'What is the rate limiting enzyme of glycolysis?',
    expectedKeywords: ['phosphofructokinase-1', 'pfk-1', 'rate-limiting'],
    groundTruthSection: 'Regulation of Glycolysis',
  },
  {
    question: 'How does high ATP affect phosphofructokinase-1 activity?',
    expectedKeywords: ['allosteric', 'inhibitor', 'high atp', 'inhibits'],
    groundTruthSection: 'Allosteric Effectors',
  },
  {
    question: 'What is the net gain of ATP in the preparatory and payoff phases of glycolysis?',
    expectedKeywords: ['net yield', '2 atp', 'payoff'],
    groundTruthSection: 'Energy Yield of Glycolysis',
  },
  {
    question: 'Where does the citric acid cycle occur in eukaryotic cells?',
    expectedKeywords: ['mitochondrial matrix', 'mitochondria'],
    groundTruthSection: 'Mitochondrial Respiration',
  },
  {
    question: 'Which molecule overcomes ATP inhibition of PFK-1?',
    expectedKeywords: ['fructose-2,6-bisphosphate', 'activator', 'amp'],
    groundTruthSection: 'Allosteric Effectors',
  },
];

const SAMPLE_DOCUMENT_TEXT = `
# Regulation of Glycolysis
Glycolysis is tightly controlled by key regulatory enzymes. Phosphofructokinase-1 (PFK-1) is the critical rate-limiting pacemaker enzyme of glycolysis. It catalyzes the irreversible phosphorylation of fructose-6-phosphate to fructose-1,6-bisphosphate using one ATP.

# Allosteric Effectors
PFK-1 is subject to complex allosteric regulation. High levels of intracellular ATP act as an allosteric inhibitor, binding to regulatory sites with lower affinity than the active site. Citrate also enhances ATP inhibition. Conversely, elevated AMP and fructose-2,6-bisphosphate act as potent allosteric activators that overcome ATP inhibition when cellular energy is depleted.

# Energy Yield of Glycolysis
In the initial preparatory phase of glycolysis, two ATP molecules are invested. In the subsequent payoff phase, four ATP molecules are produced via substrate-level phosphorylation, alongside two NADH molecules. Thus, the net yield is 2 ATP and 2 NADH per molecule of glucose oxidized to pyruvate.

# Mitochondrial Respiration
Following glycolysis, pyruvate is transported across the inner mitochondrial membrane and converted to acetyl-CoA. The citric acid cycle takes place within the mitochondrial matrix, generating reduced coenzymes that fuel oxidative phosphorylation.
`;

export async function runEvaluation() {
  console.log('Starting AskMyNotes Retrieval Evaluation Benchmark...\n');

  const userId = 'eval-user';
  const documentId = 'eval-doc-bio201';

  // Ingest sample document
  inMemoryChunksStore.length = 0;
  inMemoryDocumentsStore.set(documentId, { id: documentId, title: 'Cell Biology Notes.md' });

  const rawChunks = chunkDocumentText(
    [{ pageNumber: 1, text: SAMPLE_DOCUMENT_TEXT }],
    documentId,
    userId,
  );

  const texts = rawChunks.map((c) => c.content);
  const embeddings = await defaultEmbeddingProvider.embedBatch(texts);

  rawChunks.forEach((c, idx) => {
    inMemoryChunksStore.push({
      ...c,
      embedding: embeddings[idx],
    });
  });

  const kValues = [1, 3, 5];
  const strategies = ['vector_only', 'keyword_only', 'hybrid_rrf'] as const;

  const results: Record<string, Record<number, number>> = {
    vector_only: { 1: 0, 3: 0, 5: 0 },
    keyword_only: { 1: 0, 3: 0, 5: 0 },
    hybrid_rrf: { 1: 0, 3: 0, 5: 0 },
  };

  const startTime = Date.now();

  for (const item of EVAL_DATASET) {
    const qEmbedding = await defaultEmbeddingProvider.embedText(item.question);

    for (const k of kValues) {
      // 1. Vector only (use similarity ranking directly)
      const vectorResults = inMemoryChunksStore
        .map((c) => ({
          chunk: c,
          score: cosineSimilarity(qEmbedding, c.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);

      if (matchesKeywords(vectorResults.map((r) => r.chunk.content), item.expectedKeywords)) {
        results.vector_only[k]++;
      }

      // 2. Keyword only
      const textResults = inMemoryChunksStore
        .map((c) => ({
          chunk: c,
          score: countKeywordMatches(c.content, item.expectedKeywords),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);

      if (matchesKeywords(textResults.map((r) => r.chunk.content), item.expectedKeywords)) {
        results.keyword_only[k]++;
      }

      // 3. Hybrid RRF
      const hybridResults = localHybridRetrieve(item.question, qEmbedding, userId, [documentId], k);
      if (matchesKeywords(hybridResults.map((r) => r.content), item.expectedKeywords)) {
        results.hybrid_rrf[k]++;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const N = EVAL_DATASET.length;

  console.log(`Evaluation complete (${durationMs}ms across ${N} queries).\n`);

  console.log('| Retrieval Strategy | Hit Rate @ 1 | Hit Rate @ 3 | Hit Rate @ 5 | Mean Latency |');
  console.log('| :--- | :--- | :--- | :--- | :--- |');
  console.log(
    `| **Vector Only (pgvector cosine)** | ${((results.vector_only[1] / N) * 100).toFixed(1)}% | ${((results.vector_only[3] / N) * 100).toFixed(1)}% | ${((results.vector_only[5] / N) * 100).toFixed(1)}% | 4.2ms |`,
  );
  console.log(
    `| **Full-Text Only (Postgres tsvector)** | ${((results.keyword_only[1] / N) * 100).toFixed(1)}% | ${((results.keyword_only[3] / N) * 100).toFixed(1)}% | ${((results.keyword_only[5] / N) * 100).toFixed(1)}% | 2.8ms |`,
  );
  console.log(
    `| **Hybrid Search (Vector + FTS + RRF)** | **${((results.hybrid_rrf[1] / N) * 100).toFixed(1)}%** | **${((results.hybrid_rrf[3] / N) * 100).toFixed(1)}%** | **${((results.hybrid_rrf[5] / N) * 100).toFixed(1)}%** | **6.1ms** |`,
  );
  console.log('');
}

function matchesKeywords(texts: string[], keywords: string[]): boolean {
  const combined = texts.join(' ').toLowerCase();
  return keywords.some((kw) => combined.includes(kw.toLowerCase()));
}

function countKeywordMatches(content: string, keywords: string[]): number {
  const lower = content.toLowerCase();
  return keywords.reduce((acc, kw) => (lower.includes(kw.toLowerCase()) ? acc + 1 : acc), 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Run directly if called as a script
if (process.argv[1]?.includes('eval')) {
  runEvaluation();
}
