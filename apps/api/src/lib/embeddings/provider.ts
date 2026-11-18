import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EMBEDDING_DIMENSION } from '@askmynotes/shared';
import { createLogger } from '../logger/index.js';

const logger = createLogger('embeddingProvider');

export interface EmbeddingProvider {
  name: string;
  dimension: number;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  hashContent(text: string): string;
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  name = 'gemini';
  dimension = EMBEDDING_DIMENSION; // 768
  private client: GoogleGenerativeAI | null = null;
  private modelName = 'text-embedding-004';
  private inMemoryCache = new Map<string, number[]>();

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key !== 'your-gemini-api-key') {
      this.client = new GoogleGenerativeAI(key);
    }
  }

  hashContent(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  async embedText(text: string): Promise<number[]> {
    const hash = this.hashContent(text);
    if (this.inMemoryCache.has(hash)) {
      return this.inMemoryCache.get(hash)!;
    }

    if (!this.client) {
      // Deterministic pseudo-embedding for testing/demo without API keys
      const pseudo = this.generateDeterministicVector(hash);
      this.inMemoryCache.set(hash, pseudo);
      return pseudo;
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      const result = await model.embedContent(text);
      const vector = result.embedding.values;
      this.inMemoryCache.set(hash, vector);
      return vector;
    } catch (err: any) {
      logger.error({ error: err.message }, 'Gemini embedding error, falling back to deterministic vector');
      const pseudo = this.generateDeterministicVector(hash);
      return pseudo;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const batchSize = 10;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((text) => this.embedText(text));
      const batchVectors = await Promise.all(batchPromises);
      results.push(...batchVectors);
    }

    return results;
  }

  /**
   * Generates a normalized 768-dim deterministic vector from a hash for unit tests / dev mode
   */
  private generateDeterministicVector(hash: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    let sumSquares = 0;

    for (let i = 0; i < this.dimension; i++) {
      const charCode = hash.charCodeAt(i % hash.length);
      const val = Math.sin((i + 1) * charCode);
      vector[i] = val;
      sumSquares += val * val;
    }

    // Normalize to unit length
    const magnitude = Math.sqrt(sumSquares);
    return vector.map((v) => v / magnitude);
  }
}

export const defaultEmbeddingProvider = new GeminiEmbeddingProvider();
