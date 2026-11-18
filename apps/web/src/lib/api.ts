const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    // Will add auth token in Phase 2
    return {
      'Content-Type': 'application/json',
    };
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message || 'Request failed', body);
    }
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message || 'Request failed', data);
    }
    return res.json();
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message || 'Request failed', data);
    }
    return res.json();
  }

  async delete(path: string): Promise<void> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(res.status, data.message || 'Request failed', data);
    }
  }

  streamSSE(path: string, body: unknown, callbacks: {
    onToken: (token: string) => void;
    onCitation: (citation: unknown) => void;
    onDone: (data: { messageId: string; conversationId: string }) => void;
    onError: (error: string) => void;
  }): AbortController {
    const controller = new AbortController();

    (async () => {
      try {
        const headers = await this.getHeaders();
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: { ...headers, Accept: 'text/event-stream' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          callbacks.onError(data.message || 'Stream failed');
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                switch (data.type) {
                  case 'token':
                    callbacks.onToken(data.content);
                    break;
                  case 'citation':
                    callbacks.onCitation(data.citation);
                    break;
                  case 'done':
                    callbacks.onDone({ messageId: data.messageId, conversationId: data.conversationId });
                    break;
                  case 'error':
                    callbacks.onError(data.message);
                    break;
                }
              } catch {
                // Skip malformed events
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          callbacks.onError((err as Error).message);
        }
      }
    })();

    return controller;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isRateLimited() {
    return this.status === 429;
  }

  get retryAfterSeconds(): number | undefined {
    const body = this.body as Record<string, unknown>;
    return typeof body?.retryAfterSeconds === 'number' ? body.retryAfterSeconds : undefined;
  }
}

export const api = new ApiClient(API_BASE);
