# AskMyNotes System Architecture

AskMyNotes is an SDE-grade, multi-tenant document Q&A and active-recall study platform engineered exclusively on free-tier cloud infrastructure.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    User["Student (Browser)"]
    Vercel["Frontend (Vercel)<br/>React 18 + Vite + Tailwind CSS"]
    Render["Backend API & Worker (Render Free)<br/>Node.js + Express + TypeScript"]
    SupabaseAuth["Supabase Auth<br/>Google OAuth (JWT)"]
    SupabaseDB["Supabase Postgres<br/>pgvector (HNSW) + Full-Text Search (GIN)"]
    SupabaseStorage["Supabase Storage<br/>Private Bucket (Signed Access)"]
    UpstashRedis["Upstash Redis (Free Tier)<br/>BullMQ Queue + Sliding Window Rate Limiter + Cache"]
    Gemini["Google Gemini API (Free Tier)<br/>gemini-embedding-001 & gemini-flash-lite-latest"]
    Groq["Groq API (Free Tier Fallback)<br/>openai/gpt-oss-20b"]

    User -->|"Google OAuth"| SupabaseAuth
    User -->|"Web App UI"| Vercel
    Vercel -->|"REST & SSE Streams"| Render
    Render -->|"Verify Session"| SupabaseAuth
    Render -->|"Ingestion Jobs & Rate Limits"| UpstashRedis
    Render -->|"Upload / Read Files"| SupabaseStorage
    Render -->|"Hybrid Search RPC & CRUD"| SupabaseDB
    Render -->|"Embeddings & Chat Synthesis"| Gemini
    Gemini -.->|"Failover on Quota"| Groq
```

---

## 2. Ingestion Pipeline Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Student
    participant API as Express API
    participant Queue as BullMQ (Upstash Redis)
    participant Worker as Ingestion Worker
    participant Storage as Supabase Storage
    participant Embed as Gemini Embeddings
    participant DB as Postgres (pgvector)

    User->>API: POST /api/documents (Multipart PDF/TXT/MD)
    API->>Storage: Store file in private bucket (path: user_id/doc_id/file)
    API->>DB: INSERT into documents (status: 'queued', progress: 0)
    API->>Queue: Add job `ingest-{documentId}`
    API-->>User: 202 Accepted (Document ID + queued status)

    Queue->>Worker: Dispatch Ingestion Job
    Worker->>DB: UPDATE status: 'parsing', progress: 25
    Worker->>Worker: Parse PDF text & extract page boundaries
    Worker->>Worker: Recursive Chunking (~500-800 tokens, 12% overlap, preserve headings)
    Worker->>DB: UPDATE status: 'embedding', progress: 50
    Worker->>Embed: Batch embed chunk texts (text-embedding-004, 768 dims)
    Worker->>DB: Idempotent upsert to chunks (delete old -> batch insert)
    Worker->>DB: UPDATE status: 'ready', progress: 100
    Worker-->>Queue: Job completed
```

### Idempotency Guarantee
Ingestion jobs are fully idempotent:
- BullMQ assigns `jobId: documentId`, preventing duplicate queued executions.
- Before chunk insertion, the worker issues `DELETE FROM chunks WHERE document_id = $id`, ensuring retries or duplicate job deliveries never duplicate vectors or chunks.

---

## 3. Hybrid Retrieval & SSE Query Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Student
    participant API as Express API (Chat)
    participant Cache as Redis Answer Cache
    participant Embed as Gemini Embeddings
    participant DB as Postgres pgvector & FTS
    participant LLM as Gemini 1.5 Flash (or Groq)

    User->>API: POST /api/chat (SSE stream request)
    API->>API: Verify Auth & Check Sliding-Window Rate Limit
    API->>Cache: GET cache:qa:{hash(question + doc_ids)}
    alt Cache Hit
        Cache-->>API: Cached answer & citations
        API-->>User: Stream cached citations & tokens
    else Cache Miss
        API->>Embed: Embed question (768-dim vector)
        API->>DB: Call RPC `hybrid_search(embedding, text, user_id, doc_ids)`
        Note over DB: Computes Cosine Similarity (HNSW)<br/>Computes ts_rank_cd (GIN tsv)<br/>Merges via RRF: 1/(60 + r_vec) + 1/(60 + r_text)
        DB-->>API: Top-K Ranked Chunks with Metadata
        alt Max Score < 0.25 (Guardrail Triggered)
            API-->>User: "I couldn't find this in your notes."
        else Confident Retrieval
            API-->>User: Stream citation chips: [p.14 · bio.pdf]
            API->>LLM: Stream prompt with strict context & chunk citations
            LLM-->>API: Stream token chunks
            API-->>User: Stream tokens with soft caret
            API->>Cache: Cache answer & citations (TTL: 300s)
            API->>DB: Persist messages to conversation
        end
    end
```

---

## 4. Multi-Tenancy & Row Level Security (RLS) Model

Supabase Postgres Row Level Security is active on every user-owned table:

```sql
-- Example RLS Policy enforced for Documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);
```

- **Storage Isolation**: Storage policies enforce that users can only upload and read objects within their assigned folder: `(storage.foldername(name))[1] = auth.uid()::text`.
- **Database Isolation**: Foreign keys cascade deletions (`ON DELETE CASCADE`) from documents to chunks, messages, and flashcards. Deleting a document removes all associated vectors and metadata instantly.
- **Service Role**: Backend workers use the Supabase `service_role` key strictly when executing scheduled asynchronous worker jobs that run out-of-band of HTTP requests.

---

## 5. Rate Limiting & Quota Protection

To guarantee 100% operation on free tiers, sliding-window rate limiting is implemented via Upstash Redis sorted sets (`ZSET`):

| Action | Limit | Window | Purpose |
| :--- | :--- | :--- | :--- |
| **Chat Queries** | 20 requests | 60 seconds | Protects Gemini free-tier RPM (15-60 RPM) |
| **Document Uploads** | 10 uploads | 300 seconds | Protects storage footprint & worker compute |
| **Flashcard Gen** | 5 decks | 300 seconds | Conserves LLM output tokens |
| **Quiz Gen** | 5 quizzes | 300 seconds | Conserves LLM output tokens |

When a limit is reached:
- Response returns `HTTP 429 Too Many Requests`.
- Standard `Retry-After: <seconds>` response header is attached.
- Frontend displays an inline countdown toast indicating exactly when queries become available.

---

## 6. Resilience & Swappable LLM Layer

The system defines clean TypeScript interfaces:
- `interface LlmProvider`
- `interface EmbeddingProvider`

If the Google Gemini API returns an error or quota exhaustion (HTTP 429), `ResilientLlmService` automatically fails over to Groq's high-speed free tier (`llama-3.1-8b-instant`) without terminating user connections.
