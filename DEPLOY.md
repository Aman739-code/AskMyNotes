# AskMyNotes Deployment Guide (100% Free Tier)

This step-by-step guide walks you through deploying AskMyNotes to production across **Vercel**, **Render**, **Supabase**, and **Upstash Redis** without requiring a credit card or incurring any costs.

---

## Architecture Topology

| Layer | Service | Free Tier Limits |
| :--- | :--- | :--- |
| **Frontend** | Vercel | 100 GB bandwidth / month, unlimited deployments |
| **Backend API + Worker** | Render Free Web Service | 512 MB RAM, 0.1 CPU, spun down after 15m inactivity |
| **Database & Auth** | Supabase Free | 500 MB Postgres database, pgvector, 1 GB Storage |
| **Queue & Cache** | Upstash Redis | 10,000 commands / day, 256 MB storage |
| **LLM & Embeddings** | Google Gemini (AI Studio) | 15 RPM for Gemini 1.5 Flash, 1500 RPD for text-embedding-004 |
| **Fallback LLM** | Groq Cloud | 30 RPM, 14,400 RPD for Llama-3.1-8B-Instant |

---

## Step 1: Supabase Setup (Database, Storage & Auth)

1. Create a free account at [supabase.com](https://supabase.com) and create a new project named `askmynotes`.
2. Go to **Project Settings -> API** and copy:
   - `Project URL`
   - `Project API Keys -> anon public`
   - `Project API Keys -> service_role secret`
3. Go to **SQL Editor** in the Supabase Dashboard:
   - Run the contents of `supabase/migrations/00001_initial_schema.sql` (enables `pgvector`, creates tables, RLS policies, HNSW indexes, and the `hybrid_search` RPC function).
   - Run the contents of `supabase/migrations/00002_storage.sql` (creates the private `documents` bucket with RLS policies).
4. Go to **Authentication -> Providers -> Google**:
   - Enable Google OAuth.
   - Enter your Google Cloud OAuth Client ID and Secret.
   - In your Google Cloud Console, add Supabase's redirect URI: `https://<YOUR-PROJECT-ID>.supabase.co/auth/v1/callback`.

---

## Step 2: Upstash Redis Setup (BullMQ Queue & Rate Limiter)

1. Create a free account at [upstash.com](https://upstash.com).
2. Click **Create Database**:
   - Name: `askmynotes-redis`
   - Region: Select the region closest to your Render service (e.g. `us-east-1` or `eu-central-1`).
   - Eviction: Enabled (`volatile-lru`).
3. Under the database details, scroll to **REST / Redis Connection URL** and copy the `rediss://...` string.

---

## Step 3: API Keys for LLM (Google Gemini & Groq)

1. **Google Gemini (Primary)**:
   - Go to [aistudio.google.com](https://aistudio.google.com/).
   - Click **Get API key** and generate a free API key.
2. **Groq (Secondary Fallback)**:
   - Go to [console.groq.com](https://console.groq.com/).
   - Create a free account and generate an API key.

---

## Step 4: Deploy Backend API & Worker to Render

The API server and BullMQ background worker run as co-located modules in a single free Render Web Service.

1. Create a free account at [render.com](https://render.com).
2. Click **New + -> Web Service** and connect your GitHub repository.
3. Configure the service:
   - **Name**: `askmynotes-api`
   - **Environment**: `Node`
   - **Root Directory**: (Leave blank or root)
   - **Build Command**: `npm install && npm run build:api`
   - **Start Command**: `npm run start -w apps/api`
   - **Plan**: `Free`
4. Add the following **Environment Variables**:

| Variable | Description | Example / Source |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | HTTP port provided by Render | `10000` |
| `CORS_ORIGIN` | Your Vercel frontend URL | `https://askmynotes.vercel.app` |
| `SUPABASE_URL` | Supabase Project URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `REDIS_URL` | Upstash Redis Connection URI | `rediss://default:pwd@endpoint.upstash.io:6379` |
| `GEMINI_API_KEY` | Google AI Studio Key | `AIzaSy...` |
| `GROQ_API_KEY` | Groq Cloud Key | `gsk_...` |
| `LOG_LEVEL` | Pino logger verbosity | `info` |

5. Click **Deploy Web Service**. Once deployed, copy your Render URL (e.g., `https://askmynotes-api.onrender.com`).

---

## Step 5: Deploy React Frontend to Vercel

1. Create a free account at [vercel.com](https://vercel.com).
2. Click **Add New... -> Project** and import your AskMyNotes repository.
3. In the project setup:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Configure **Environment Variables**:

| Variable | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://<YOUR-PROJECT-ID>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<YOUR-SUPABASE-ANON-KEY>` |
| `VITE_API_URL` | `https://askmynotes-api.onrender.com/api` |

5. Click **Deploy**. Vercel will build and serve your app globally on an Edge CDN.
6. Once deployed, return to **Render -> Environment Variables** and update `CORS_ORIGIN` to match your production Vercel URL.
7. Return to **Supabase Dashboard -> Authentication -> URL Configuration** and add your Vercel URL to **Redirect URLs**:
   `https://<YOUR-VERCEL-DOMAIN>.vercel.app/**`

---

## Free-Tier Caveats & Operational Notes

- **Render Cold Starts**: Render's free tier spins down the web service after 15 minutes of inactivity. The first request after idling may take ~30-45 seconds to wake up. Health checks will report status immediately once warm.
- **Upstash Polling Tuning**: BullMQ worker settings have been tuned with `drainDelay: 500ms` and `stalledInterval: 60000ms` to prevent burning through Upstash's 10,000 daily commands during idle periods.
- **Gemini Free Quota**: Google Gemini enforces a 15 RPM limit on free tier keys. AskMyNotes protects this with Upstash sliding-window rate limiting (20 requests / 60 seconds per user) and automatic fallback to Groq (`llama-3.1-8b-instant`).
