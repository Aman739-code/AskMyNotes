-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Profiles table (synced from auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'text/plain', 'text/markdown')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  page_count INTEGER,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'parsing', 'embedding', 'ready', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_number INTEGER,
  section_heading TEXT,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  embedding vector(768),
  tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_document_chunk_index UNIQUE (document_id, chunk_index)
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  document_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  due_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage events table
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'upload', 'flashcard_gen', 'quiz_gen')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- INDEXES
-- =====================

-- Vector similarity search (HNSW for better recall)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON chunks USING gin (tsv);

-- Foreign key & query lookups
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON chunks (user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_content_hash ON chunks (content_hash);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_document_id ON flashcards (document_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_due_at ON flashcards (user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_kind ON usage_events (user_id, kind, created_at);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents: users can only access their own documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Chunks: users can only access their own chunks
CREATE POLICY "Users can view own chunks" ON chunks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chunks" ON chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chunks" ON chunks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chunks" ON chunks
  FOR DELETE USING (auth.uid() = user_id);

-- Conversations: users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: users can only access their own messages
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- Flashcards: users can only access their own flashcards
CREATE POLICY "Users can view own flashcards" ON flashcards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flashcards" ON flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcards" ON flashcards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcards" ON flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- Usage events: users can only access their own events
CREATE POLICY "Users can view own usage events" ON usage_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage events" ON usage_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================
-- FUNCTIONS
-- =====================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Hybrid search function: combines vector similarity + full-text search with RRF
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(768),
  query_text TEXT,
  match_user_id UUID,
  match_document_ids UUID[] DEFAULT NULL,
  match_count INTEGER DEFAULT 10,
  rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  page_number INTEGER,
  section_heading TEXT,
  chunk_index INTEGER,
  token_count INTEGER,
  content_hash TEXT,
  similarity FLOAT,
  text_rank FLOAT,
  rrf_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      c.id,
      c.document_id,
      c.content,
      c.page_number,
      c.section_heading,
      c.chunk_index,
      c.token_count,
      c.content_hash,
      (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) AS vector_rank
    FROM chunks c
    WHERE c.user_id = match_user_id
      AND (match_document_ids IS NULL OR c.document_id = ANY(match_document_ids))
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      c.id,
      c.document_id,
      c.content,
      c.page_number,
      c.section_heading,
      c.chunk_index,
      c.token_count,
      c.content_hash,
      ts_rank_cd(c.tsv, plainto_tsquery('english', query_text))::FLOAT AS text_rank,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.tsv, plainto_tsquery('english', query_text)) DESC) AS text_rank_pos
    FROM chunks c
    WHERE c.user_id = match_user_id
      AND (match_document_ids IS NULL OR c.document_id = ANY(match_document_ids))
      AND c.tsv @@ plainto_tsquery('english', query_text)
    ORDER BY text_rank DESC
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, t.id) AS id,
      COALESCE(v.document_id, t.document_id) AS document_id,
      COALESCE(v.content, t.content) AS content,
      COALESCE(v.page_number, t.page_number) AS page_number,
      COALESCE(v.section_heading, t.section_heading) AS section_heading,
      COALESCE(v.chunk_index, t.chunk_index) AS chunk_index,
      COALESCE(v.token_count, t.token_count) AS token_count,
      COALESCE(v.content_hash, t.content_hash) AS content_hash,
      COALESCE(v.similarity, 0::FLOAT) AS similarity,
      COALESCE(t.text_rank, 0::FLOAT) AS text_rank,
      (COALESCE(1.0 / (rrf_k + v.vector_rank), 0::FLOAT) + COALESCE(1.0 / (rrf_k + t.text_rank_pos), 0::FLOAT))::FLOAT AS rrf_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT
    combined.id,
    combined.document_id,
    combined.content,
    combined.page_number,
    combined.section_heading,
    combined.chunk_index,
    combined.token_count,
    combined.content_hash,
    combined.similarity,
    combined.text_rank,
    combined.rrf_score
  FROM combined
  ORDER BY combined.rrf_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
