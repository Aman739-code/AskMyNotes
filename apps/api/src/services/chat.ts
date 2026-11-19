import { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { defaultLlmService } from '../lib/llm/provider.js';
import { hybridRetrieve, toCitations } from './retrieval.js';
import { CacheService } from '../lib/cache/index.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('chatService');

interface ChatStreamParams {
  userId: string;
  message: string;
  conversationId?: string;
  documentIds?: string[];
  res: Response;
}

export async function handleChatStream({
  userId,
  message,
  conversationId,
  documentIds,
  res,
}: ChatStreamParams): Promise<void> {
  const currentConvId = conversationId || randomUUID();
  const assistantMessageId = randomUUID();

  // SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  const sendEvent = (type: string, data: Record<string, any>) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    const exhaustiveQuery = /\b(all|every|complete|full|entire|list|formula|formulas|equation|equations)\b/i.test(message);

    // Step 1: Check Answer Cache
    const cacheKey = CacheService.getQueryCacheKey(message, documentIds);
    const cached = exhaustiveQuery
      ? null
      : await CacheService.get<{ answer: string; citations: any[] }>(cacheKey);

    if (cached) {
      logger.info({ message }, 'Serving cached answer');
      for (const cite of cached.citations) {
        sendEvent('citation', { citation: cite });
      }
      const words = cached.answer.split(' ');
      for (const w of words) {
        sendEvent('token', { content: w + ' ' });
        await new Promise((r) => setTimeout(r, 10));
      }
      sendEvent('done', {
        messageId: assistantMessageId,
        conversationId: currentConvId,
      });
      res.end();
      return;
    }

    // Step 2: Hybrid Retrieval (pgvector + full-text search + RRF)
    const retrievalCount = exhaustiveQuery ? 20 : 6;
    const retrievedChunks = await hybridRetrieve(message, userId, documentIds, retrievalCount);

    // Guardrail Check: If retrieval confidence is low or no chunks returned
    const maxScore = retrievedChunks.length > 0 ? retrievedChunks[0].similarity : 0;
    const isLowConfidence = retrievedChunks.length === 0;

    if (isLowConfidence) {
      sendEvent('token', { content: "I couldn't find this in your notes." });
      sendEvent('done', {
        messageId: assistantMessageId,
        conversationId: currentConvId,
      });
      res.end();
      return;
    }

    // Step 3: Stream Citations to UI
    const citations = toCitations(retrievedChunks);
    for (const cite of citations) {
      sendEvent('citation', { citation: cite });
    }

    // Step 4: Construct Strict Context Prompt
    const contextText = retrievedChunks
      .map(
        (c, idx) =>
          `[Source ${idx + 1} | Page ${c.pageNumber || 'N/A'} | ${c.documentTitle}]\n${c.content}`,
      )
      .join('\n\n---\n\n');

    const systemInstruction =
      `You are AskMyNotes, a strict and helpful study assistant for university students.\n` +
      `RULES:\n` +
      `1. Answer the student's question ONLY using the factual context provided below.\n` +
      `2. If the context does not contain enough information to answer, state: "I couldn't find this in your notes." Do not make assumptions or extrapolate outside the text.\n` +
      `3. When making statements from a source, include inline citations using this exact format: [p.<PageNumber> · <DocumentTitle>]. For example: [p.14 · BIO-201.pdf].\n` +
      `4. Format the answer in readable Markdown. Use headings, bold text, bullets, and numbered lists where helpful.\n` +
      `5. When the notes contain a formula, present it in LaTeX using \`$$ ... $$\` for a display formula or \`$ ... $\` for an inline formula. Define each variable in plain language.\n` +
      `6. Do not repeat raw Markdown delimiters literally. Use proper Markdown and LaTeX syntax.\n` +
      (exhaustiveQuery
        ? `7. The user explicitly requested a complete or comprehensive answer. Scan every supplied source chunk before responding. Include equations, named formulas, and explicit mathematical relationships such as price equals marginal cost or price greater than marginal cost. Do not stop after the first formula. Number every distinct formula or relationship and give a separate variable explanation for each. If no formula or mathematical relationship exists in the supplied context, state that clearly.\n`
        : ``) +
      `\nCONTEXT FROM NOTES:\n` +
      contextText;

    let fullAnswer = '';

    await defaultLlmService.generateStream(message, systemInstruction, {
      onToken: (token) => {
        fullAnswer += token;
        sendEvent('token', { content: token });
      },
      onDone: async () => {
        // Cache the result for 5 minutes
        await CacheService.set(cacheKey, { answer: fullAnswer, citations }, 300);

        // Record usage event
        recordUsageEvent(userId, 'chat', { queryLength: message.length });

        // Save conversation and message to Supabase
        await persistChatMessage({
          conversationId: currentConvId,
          userId,
          userPrompt: message,
          assistantAnswer: fullAnswer,
          citations,
          documentIds,
        });

        sendEvent('done', {
          messageId: assistantMessageId,
          conversationId: currentConvId,
        });
        res.end();
      },
      onError: (err) => {
        logger.error({ error: err.message }, 'LLM streaming error');
        sendEvent('error', { message: err.message });
        res.end();
      },
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Chat stream failed');
    sendEvent('error', { message: err.message || 'Stream generation failed' });
    res.end();
  }
}

async function recordUsageEvent(userId: string, kind: string, metadata: Record<string, any>) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('usage_events').insert({
        user_id: userId,
        kind,
        metadata,
      });
    } catch {
      // Non-fatal
    }
  }
}

async function persistChatMessage({
  conversationId,
  userId,
  userPrompt,
  assistantAnswer,
  citations,
  documentIds,
}: {
  conversationId: string;
  userId: string;
  userPrompt: string;
  assistantAnswer: string;
  citations: any[];
  documentIds?: string[];
}) {
  if (isSupabaseConfigured && supabase) {
    try {
      // Upsert conversation
      await supabase.from('conversations').upsert({
        id: conversationId,
        user_id: userId,
        title: userPrompt.slice(0, 50),
        document_ids: documentIds || [],
      });

      // Insert user message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: userPrompt,
      });

      // Insert assistant message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: assistantAnswer,
        citations,
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to persist conversation to DB');
    }
  }
}
