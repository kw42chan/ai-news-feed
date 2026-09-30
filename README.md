# AI News, Minus the Noise

A curated AI news feed for non-technical professionals who want to keep up with AI without the jargon.

**Pitch:** All the AI news you care about from YouTube and Reddit in one feed, without the noise.

## Features

- **Beginner-friendly sources:** Curated YouTube channels and Reddit communities focused on practical AI for everyday users
- **Plain-English summaries:** Every item includes a one-line "what this means for you" summary powered by AI
- **Smart filtering:** Filter by source type (Videos/Discussions), sort by Latest or Popular, filter by tags
- **Auto-updated:** New content pulled every 20 minutes via scheduled Edge Functions
- **Mobile-first design:** Dark theme UI optimized for all devices

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  React SPA      │────▶│  Supabase        │◀────│  Edge Function  │
│  (Vite/TS)      │     │  (PostgreSQL)    │     │  (Deno)         │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
        │                       │                         │
        │                       │                         ▼
        ▼                       │              ┌──────────────────┐
   Vercel                       │              │  YouTube RSS     │
                                │              │  Reddit API      │
                                │              │  OpenRouter      │
                                ▼              └──────────────────┘
                         pg_cron (*/20 min)
```

**Data Flow:**
1. `pg_cron` triggers the `ingest` Edge Function every 20 minutes
2. Edge Function fetches RSS feeds from YouTube channels
3. Edge Function fetches posts from Reddit (JSON API with OAuth fallback to RSS)
4. New items are upserted to `feed_items` table (dedupe on URL)
5. OpenRouter generates plain-English summaries for new items
6. React frontend reads from Supabase using the publishable key (RLS-protected)

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS 4 + Lucide React
- **Backend:** Supabase (PostgreSQL + Edge Functions + pg_cron)
- **AI:** OpenRouter (configurable model, default: gemini-2.0-flash-lite)
- **Hosting:** Vercel (frontend), Supabase (backend)

## Local Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase CLI (optional, for local backend)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/kw42chan/ai-news-feed.git
   cd ai-news-feed
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` from example:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`.

## Environment Variables

### Frontend (Vite)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key | Yes |

### Edge Function Secrets (Supabase Vault)

These are stored in Supabase Vault and accessed by the Edge Function:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI summaries | Yes |
| `OPENROUTER_MODEL` | OpenRouter model ID (default: `google/gemini-2.0-flash-lite-001`) | No |
| `REDDIT_CLIENT_ID` | Reddit API OAuth client ID | No* |
| `REDDIT_CLIENT_SECRET` | Reddit API OAuth secret | No* |
| `INGEST_CRON_SECRET` | Auto-generated secret for cron auth | Auto |
| `SUPABASE_URL` | Project URL (for cron job) | Yes |
| `SUPABASE_ANON_KEY` | Anon key (for cron job) | Yes |

*Reddit often blocks requests from datacenter IPs. If you see 403/429 errors in ingest runs, create a Reddit API app and add OAuth credentials.

## Supabase Setup

### 1. Link to Project

```bash
supabase link --project-ref gmfzwuunaqzutbhudsxn
```

### 2. Apply Migrations

The schema is already applied to the remote DB. For a fresh setup:

```bash
supabase db push
```

Migrations:
- `20260930000000_init_feed_schema.sql` - Tables, indexes, RLS policies
- `20260930000001_seed_sources.sql` - Default YouTube channels and subreddits
- `20260930000002_setup_ingest_cron.sql` - pg_cron job for scheduled ingestion

### 3. Add Vault Secrets

Before running the cron migration, add these secrets to Vault:

```sql
-- In Supabase SQL Editor
SELECT vault.create_secret('https://gmfzwuunaqzutbhudsxn.supabase.co', 'SUPABASE_URL');
SELECT vault.create_secret('your-anon-key', 'SUPABASE_ANON_KEY');
SELECT vault.create_secret('your-openrouter-api-key', 'OPENROUTER_API_KEY');
```

### 4. Deploy Edge Function

```bash
supabase functions deploy ingest --verify-jwt
```

### 5. Test Ingestion

Invoke the function manually:

```bash
supabase functions invoke ingest
```

Or via curl:
```bash
curl -X POST "https://gmfzwuunaqzutbhudsxn.supabase.co/functions/v1/ingest" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Vercel Deployment

### 1. Import Project

1. Go to [Vercel](https://vercel.com/new)
2. Import the GitHub repository
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

### 2. Configure Environment Variables

Add these in Vercel project settings:

- `VITE_SUPABASE_URL` = `https://gmfzwuunaqzutbhudsxn.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_iiUir4l77lc9VJS7MxJy7g_ix-LBwyb`

### 3. Deploy

Push to main or click Deploy in Vercel dashboard.

## Reddit API Caveat

Reddit frequently blocks requests from datacenter IPs (common with serverless functions). If ingestion shows 403/429 errors for Reddit sources:

1. Create a Reddit "script" app at https://www.reddit.com/prefs/apps
2. Add credentials to Supabase Vault:
   ```sql
   SELECT vault.create_secret('your-client-id', 'REDDIT_CLIENT_ID');
   SELECT vault.create_secret('your-client-secret', 'REDDIT_CLIENT_SECRET');
   ```
3. The Edge Function will automatically use OAuth when credentials are present

## Default Sources

### YouTube Channels (Verified)

| Channel | Focus |
|---------|-------|
| Matt Wolfe | AI tools and news |
| The AI Advantage | Practical AI tutorials |
| AI Explained | AI news analysis |
| Kevin Stratvert | Tech tutorials including AI |
| Jeff Su | AI and productivity |
| Tina Huang | AI, coding, career |
| Wes Roth | AI news with optimism |

### Subreddits

- r/ChatGPT - ChatGPT discussions
- r/OpenAI - OpenAI news
- r/artificial - General AI discussions

## Phase 2 Roadmap (Future)

The data layer is designed for extensibility. Phase 2 will add:

- **User accounts:** Sign up with role (professional, creator, etc.) and interests
- **Personalized sources:** Users can add/remove sources from their feed
- **Morning email digest:** Daily summary of top items sent to inbox
- **X (Twitter) integration:** Additional source type for AI thought leaders

Database tables ready for Phase 2:
- `profiles(user_id -> auth.users, role, interests)`
- `user_sources(user_id, source_id)`
- `digest_preferences(user_id, frequency, time)`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

MIT
