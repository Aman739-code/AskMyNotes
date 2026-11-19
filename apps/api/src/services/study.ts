import { Flashcard, QuizQuestion } from '@askmynotes/shared';
import { defaultLlmService } from '../lib/llm/provider.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { inMemoryChunksStore } from './ingestion.js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('studyService');

export async function generateFlashcardsForDocument(
  documentId: string,
  userId: string,
  count: number = 10,
): Promise<Flashcard[]> {
  logger.info({ documentId, userId, count }, 'Generating flashcards');

  // Step 1: Collect text content from document chunks
  const chunks = await getDocumentChunks(documentId, userId);
  if (chunks.length === 0) {
    throw new Error('No chunks found for this document');
  }

  const sampleText = chunks
    .slice(0, 10)
    .map((c) => c.content)
    .join('\n\n')
    .slice(0, 12000);

  const prompt =
    `Generate exactly ${count} high-quality study flashcards based on the study material below.\n` +
    `Focus on critical definitions, concepts, relationships, and mechanisms for active recall.\n` +
    `Output MUST be valid JSON array of objects with "front" and "back" strings.\n` +
    `Do not include markdown code fences or other text. Example: [{"front": "What is...", "back": "It is..."}]\n\n` +
    `MATERIAL:\n${sampleText}`;

  try {
    const rawOutput = await defaultLlmService.generateText(prompt);
    const cleaned = cleanJsonResponse(rawOutput);
    const parsed = JSON.parse(cleaned);

    const flashcards: Flashcard[] = parsed.slice(0, count).map((item: any, i: number) => ({
      id: `fc-${Date.now()}-${i}`,
      documentId,
      userId,
      front: item.front || 'Concept',
      back: item.back || 'Definition',
      ease: 2.5,
      dueAt: new Date().toISOString(),
    }));

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      await supabase.from('flashcards').insert(
        flashcards.map((f) => ({
          document_id: f.documentId,
          user_id: f.userId,
          front: f.front,
          back: f.back,
          ease: f.ease,
          due_at: f.dueAt,
        })),
      );
    }

    return flashcards;
  } catch (err: any) {
    logger.error({ error: err.message }, 'Flashcard generation failed');
    throw err;
  }
}

export async function generateQuizForDocument(
  documentId: string,
  userId: string,
  count: number = 5,
): Promise<QuizQuestion[]> {
  logger.info({ documentId, userId, count }, 'Generating quiz questions');

  const chunks = await getDocumentChunks(documentId, userId);
  if (chunks.length === 0) {
    throw new Error('No chunks found for this document');
  }

  const sampleText = chunks
    .slice(0, 10)
    .map((c) => `[Page ${c.pageNumber || 1}]\n${c.content}`)
    .join('\n\n')
    .slice(0, 12000);

  const prompt =
    `Generate exactly ${count} multiple choice exam questions based on the study material below.\n` +
    `Output MUST be valid JSON array of objects with the schema:\n` +
    `[{\n` +
    `  "question": string,\n` +
    `  "options": [string, string, string, string],\n` +
    `  "correctIndex": number (0 to 3),\n` +
    `  "explanation": string,\n` +
    `  "pageNumber": number | null\n` +
    `}]\n` +
    `Do not include markdown backticks or commentary outside JSON.\n\n` +
    `MATERIAL:\n${sampleText}`;

  try {
    const rawOutput = await defaultLlmService.generateText(prompt);
    const cleaned = cleanJsonResponse(rawOutput);
    const parsed = JSON.parse(cleaned);

    return parsed.slice(0, count).map((item: any, i: number) => ({
      id: `q-${Date.now()}-${i}`,
      question: item.question,
      options: Array.isArray(item.options) ? item.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
      correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
      explanation: item.explanation || 'Refer to source material.',
      pageNumber: item.pageNumber || null,
    }));
  } catch (err: any) {
    logger.error({ error: err.message }, 'Quiz generation failed');
    throw err;
  }
}

async function getDocumentChunks(documentId: string, userId: string) {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('chunks')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', userId);
    if (data && data.length > 0) {
      return data.map((d: any) => ({
        content: d.content,
        pageNumber: d.page_number,
        sectionHeading: d.section_heading,
      }));
    }
  }

  return inMemoryChunksStore
    .filter((c) => c.documentId === documentId && c.userId === userId)
    .map((c) => ({
      content: c.content,
      pageNumber: c.pageNumber,
      sectionHeading: c.sectionHeading,
    }));
}

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned;
}
