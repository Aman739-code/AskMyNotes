import { RETRIEVAL_TOP_K, RRF_K, Citation } from '@askmynotes/shared';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { defaultEmbeddingProvider } from '../lib/embeddings/provider.js';
import { inMemoryChunksStore, inMemoryDocumentsStore } from './ingestion.js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('retrievalService');

export interface ScoredChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  pageNumber: number | null;
  sectionHeading: string | null;
  similarity: number;
  textRank: number;
  rrfScore: number;
}

export async function hybridRetrieve(
  query: string,
  userId: string,
  documentIds?: string[],
  topK: number = RETRIEVAL_TOP_K,
): Promise<ScoredChunk[]> {
  logger.info({ query, userId, documentIds, topK }, 'Executing hybrid retrieval');

  // Step 1: Embed query text using Gemini Embedding
  const queryEmbedding = await defaultEmbeddingProvider.embedText(query);

  // If Supabase is configured, call the hybrid_search RPC stored procedure
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('hybrid_search', {
        query_embedding: queryEmbedding,
        query_text: query,
        match_user_id: userId,
        match_document_ids: documentIds && documentIds.length > 0 ? documentIds : null,
        match_count: topK,
        rrf_k: RRF_K,
      });

      if (error) {
        logger.warn({ error: error.message }, 'Supabase hybrid_search RPC failed, using fallback');
      } else if (Array.isArray(data) && data.length > 0) {
        // Fetch document titles for citations
        const docIds = Array.from(new Set(data.map((item: any) => item.document_id)));
        const { data: docs } = await supabase
          .from('documents')
          .select('id, title')
          .in('id', docIds);

        const titleMap = new Map((docs || []).map((d: any) => [d.id, d.title]));

        return data.map((item: any) => ({
          id: item.id,
          documentId: item.document_id,
          documentTitle: titleMap.get(item.document_id) || 'Lecture Notes',
          content: item.content,
          pageNumber: item.page_number,
          sectionHeading: item.section_heading,
          similarity: item.similarity || 0,
          textRank: item.text_rank || 0,
          rrfScore: item.rrf_score || 0,
        }));
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'RPC error');
    }
  }

  // In-memory hybrid retrieval implementation with RRF
  return localHybridRetrieve(query, queryEmbedding, userId, documentIds, topK);
}

/**
 * Pure TypeScript implementation of Hybrid Retrieval (Vector Cosine + Keyword Match + RRF)
 * Used for evaluation benchmarks and local unit tests
 */
export function localHybridRetrieve(
  query: string,
  queryEmbedding: number[],
  userId: string,
  documentIds?: string[],
  topK: number = RETRIEVAL_TOP_K,
): ScoredChunk[] {
  // Filter user chunks and matching documents
  const eligible = inMemoryChunksStore.filter((chunk) => {
    if (chunk.userId !== userId) return false;
    if (documentIds && documentIds.length > 0 && !documentIds.includes(chunk.documentId)) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) return [];

  // 1. Calculate Vector Cosine Similarity
  const vectorRanked = eligible
    .map((chunk) => ({
      chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  // 2. Calculate Text Match (BM25-like keyword frequency)
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const textRanked = eligible
    .map((chunk) => {
      const contentLower = chunk.content.toLowerCase();
      let matches = 0;
      for (const word of queryWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const count = (contentLower.match(regex) || []).length;
        matches += count;
      }
      return {
        chunk,
        textRank: matches,
      };
    })
    .sort((a, b) => b.textRank - a.textRank);

  // 3. Apply Reciprocal Rank Fusion (RRF)
  const chunkScores = new Map<
    string,
    {
      chunk: any;
      similarity: number;
      textRank: number;
      rrfScore: number;
    }
  >();

  vectorRanked.forEach(({ chunk, similarity }, rank) => {
    const rrf = 1 / (RRF_K + (rank + 1));
    chunkScores.set(chunk.contentHash, {
      chunk,
      similarity,
      textRank: 0,
      rrfScore: rrf,
    });
  });

  textRanked.forEach(({ chunk, textRank }, rank) => {
    const existing = chunkScores.get(chunk.contentHash);
    const rrfContrib = 1 / (RRF_K + (rank + 1));

    if (existing) {
      existing.textRank = textRank;
      existing.rrfScore += rrfContrib;
    } else {
      chunkScores.set(chunk.contentHash, {
        chunk,
        similarity: 0,
        textRank,
        rrfScore: rrfContrib,
      });
    }
  });

  const sorted = Array.from(chunkScores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK);

  return sorted.map(({ chunk, similarity, textRank, rrfScore }) => {
    const docMeta = inMemoryDocumentsStore.get(chunk.documentId);
    return {
      id: chunk.id || chunk.contentHash.slice(0, 16),
      documentId: chunk.documentId,
      documentTitle: docMeta?.title || 'Lecture Notes',
      content: chunk.content,
      pageNumber: chunk.pageNumber,
      sectionHeading: chunk.sectionHeading,
      similarity,
      textRank,
      rrfScore,
    };
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export function toCitations(chunks: ScoredChunk[]): Citation[] {
  return chunks.map((c) => ({
    chunkId: c.id,
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    pageNumber: c.pageNumber,
    sectionHeading: c.sectionHeading,
    content: c.content,
    score: c.rrfScore,
  }));
}
