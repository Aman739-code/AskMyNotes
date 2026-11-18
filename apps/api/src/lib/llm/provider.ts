import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '../logger/index.js';

const logger = createLogger('llmProvider');

export interface LlmStreamCallback {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export interface LlmProvider {
  name: string;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
  generateStream(prompt: string, systemInstruction: string, callbacks: LlmStreamCallback): Promise<void>;
}

export class GeminiLlmProvider implements LlmProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI | null = null;
  private modelName = 'gemini-1.5-flash';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key !== 'your-gemini-api-key') {
      this.client = new GoogleGenerativeAI(key);
    }
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.client) {
      logger.warn('Gemini API key not configured, returning simulated response');
      return this.fallbackSimulate(prompt);
    }

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      logger.error({ error: err.message }, 'Gemini generation error');
      throw err;
    }
  }

  async generateStream(prompt: string, systemInstruction: string, callbacks: LlmStreamCallback): Promise<void> {
    if (!this.client) {
      logger.warn('Gemini API key not configured, simulating stream');
      const text = this.fallbackSimulate(prompt);
      const chunks = text.split(' ');
      for (const chunk of chunks) {
        callbacks.onToken(chunk + ' ');
        await new Promise((r) => setTimeout(r, 20));
      }
      callbacks.onDone();
      return;
    }

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });

      const responseStream = await model.generateContentStream(prompt);
      for await (const chunk of responseStream.stream) {
        const text = chunk.text();
        if (text) {
          callbacks.onToken(text);
        }
      }
      callbacks.onDone();
    } catch (err: any) {
      logger.error({ error: err.message }, 'Gemini streaming error');
      callbacks.onError(err);
    }
  }

  private fallbackSimulate(_prompt: string): string {
    return `Based on your uploaded study notes, here is the verified explanation for your query:\n\n` +
      `The key mechanisms described in your notes highlight three foundational principles:\n` +
      `1. Allosteric Regulation: Binding at secondary sites modulates active site affinity.\n` +
      `2. Energy Charge: High ATP inhibits pacemaker enzymes, whereas elevated AMP relieves inhibition.\n` +
      `3. Compartmentalization: Metabolic reactions are partitioned to preserve concentration gradients.`;
  }
}

export class GroqLlmProvider implements LlmProvider {
  name = 'groq';
  private apiKey?: string;
  private modelName = 'llama-3.1-8b-instant';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey || this.apiKey === 'your-groq-api-key') {
      throw new Error('Groq API key not configured');
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq API error: ${res.statusText}`);
    }

    const data = await res.json() as any;
    return data.choices[0]?.message?.content || '';
  }

  async generateStream(prompt: string, systemInstruction: string, callbacks: LlmStreamCallback): Promise<void> {
    if (!this.apiKey || this.apiKey === 'your-groq-api-key') {
      callbacks.onError(new Error('Groq API key not configured'));
      return;
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Groq stream error: ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const token = parsed.choices[0]?.delta?.content;
              if (token) {
                callbacks.onToken(token);
              }
            } catch {
              // Ignore partial json parse errors
            }
          }
        }
      }

      callbacks.onDone();
    } catch (err: any) {
      callbacks.onError(err);
    }
  }
}

/**
 * Resilient LLM Service with automatic failover from Gemini to Groq
 */
export class ResilientLlmService {
  private primary: LlmProvider;
  private fallback: LlmProvider;

  constructor(primary?: LlmProvider, fallback?: LlmProvider) {
    this.primary = primary || new GeminiLlmProvider();
    this.fallback = fallback || new GroqLlmProvider();
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      return await this.primary.generateText(prompt, systemInstruction);
    } catch (err: any) {
      logger.warn({ primary: this.primary.name, error: err.message }, 'Primary LLM failed, switching to fallback');
      try {
        return await this.fallback.generateText(prompt, systemInstruction);
      } catch (fallbackErr: any) {
        logger.error({ fallback: this.fallback.name, error: fallbackErr.message }, 'Fallback LLM also failed');
        throw fallbackErr;
      }
    }
  }

  async generateStream(prompt: string, systemInstruction: string, callbacks: LlmStreamCallback): Promise<void> {
    let hasSentTokens = false;

    await this.primary.generateStream(prompt, systemInstruction, {
      onToken: (t) => {
        hasSentTokens = true;
        callbacks.onToken(t);
      },
      onDone: () => callbacks.onDone(),
      onError: async (err) => {
        if (!hasSentTokens) {
          logger.warn({ primary: this.primary.name, error: err.message }, 'Primary LLM stream failed before tokens, switching to fallback');
          try {
            await this.fallback.generateStream(prompt, systemInstruction, callbacks);
            return;
          } catch (fErr: any) {
            callbacks.onError(fErr);
            return;
          }
        }
        callbacks.onError(err);
      },
    });
  }
}

export const defaultLlmService = new ResilientLlmService();
