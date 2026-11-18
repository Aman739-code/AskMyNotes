import { defaultEmbeddingProvider } from '../src/lib/embeddings/provider.js';
import { chunkDocumentText, inMemoryChunksStore, inMemoryDocumentsStore } from '../src/services/ingestion.js';
import { localHybridRetrieve } from '../src/services/retrieval.js';

interface BenchmarkMetrics {
  totalQueries: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  avgIngestionMs: number;
  queriesPerSecond: number;
}

const BENCHMARK_QUERIES = [
  'What is the rate-limiting step of glycolysis?',
  'Explain the allosteric regulation of phosphofructokinase-1 by ATP and AMP',
  'What is the net yield of ATP and NADH per molecule of glucose in aerobic respiration?',
  'Where in the cell does the citric acid cycle take place?',
  'How does high citrate concentration influence glycolytic flux?',
  'What role does fructose-2,6-bisphosphate play in metabolic control?',
  'Describe the mechanism of substrate-level phosphorylation in the payoff phase',
  'What happens to pyruvate under anaerobic conditions versus aerobic conditions?',
];

const SAMPLE_DOCUMENT_PAGES = Array.from({ length: 5 }, (_, i) => ({
  pageNumber: i + 1,
  text: `
# Section ${i + 1}: Principles of Bioenergetics and Cellular Regulation
Cellular metabolism is regulated through precise feedback loops and allosteric enzymes.
Phosphofructokinase-1 (PFK-1) acts as the primary pacemaker of glycolysis, controlling flux
through the preparatory and payoff phases. High levels of ATP and citrate allosterically inhibit
PFK-1, whereas AMP and fructose-2,6-bisphosphate act as potent activators.
In aerobic respiration, pyruvate undergoes oxidative decarboxylation to acetyl-CoA, which enters
the citric acid cycle in the mitochondrial matrix to generate NADH and FADH2 for the electron transport chain.
Each round of glycolysis yields a net of 2 ATP and 2 NADH molecules through substrate-level phosphorylation.
`,
}));

export async function runLoadTest(): Promise<BenchmarkMetrics> {
  console.log('Running AskMyNotes Latency & Throughput Benchmark...');

  const userId = 'loadtest-user';
  const documentId = 'doc-loadtest-1';

  // 1. Measure Ingestion Pipeline Time
  const ingestionStart = performance.now();
  inMemoryChunksStore.length = 0;
  inMemoryDocumentsStore.set(documentId, { id: documentId, title: 'Bioenergetics Textbook Chapter' });

  const rawChunks = chunkDocumentText(SAMPLE_DOCUMENT_PAGES, documentId, userId);
  const texts = rawChunks.map((c) => c.content);
  const embeddings = await defaultEmbeddingProvider.embedBatch(texts);

  rawChunks.forEach((c, idx) => {
    inMemoryChunksStore.push({
      ...c,
      embedding: embeddings[idx],
    });
  });
  const ingestionDuration = performance.now() - ingestionStart;

  // 2. Measure Query Latency over 200 consecutive requests
  const latencies: number[] = [];
  const testIterations = 200;
  const benchmarkStart = performance.now();

  for (let i = 0; i < testIterations; i++) {
    const q = BENCHMARK_QUERIES[i % BENCHMARK_QUERIES.length];
    const qStart = performance.now();
    const qEmbedding = await defaultEmbeddingProvider.embedText(q);
    localHybridRetrieve(q, qEmbedding, userId, [documentId], 10);
    const qDuration = performance.now() - qStart;
    latencies.push(qDuration);
  }

  const totalTimeSec = (performance.now() - benchmarkStart) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const max = latencies[latencies.length - 1];
  const qps = Math.round(testIterations / totalTimeSec);

  const metrics: BenchmarkMetrics = {
    totalQueries: testIterations,
    p50Ms: Number(p50.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    p99Ms: Number(p99.toFixed(2)),
    maxMs: Number(max.toFixed(2)),
    avgIngestionMs: Number(ingestionDuration.toFixed(2)),
    queriesPerSecond: qps,
  };

  console.log('\n--- Benchmark Results ---');
  console.log(`Document Ingestion Time (5 pages): ${metrics.avgIngestionMs} ms`);
  console.log(`Total Queries Tested:              ${metrics.totalQueries}`);
  console.log(`Throughput:                        ${metrics.queriesPerSecond} queries/sec`);
  console.log(`p50 Retrieval Latency:             ${metrics.p50Ms} ms`);
  console.log(`p95 Retrieval Latency:             ${metrics.p95Ms} ms`);
  console.log(`p99 Retrieval Latency:             ${metrics.p99Ms} ms`);
  console.log(`Max Latency:                       ${metrics.maxMs} ms`);
  console.log('-------------------------\n');

  return metrics;
}

if (process.argv[1]?.includes('loadtest')) {
  runLoadTest();
}
