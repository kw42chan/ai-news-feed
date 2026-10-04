# AI News, Minus the Noise

A curated AI news feed for non-technical professionals who want to keep up with AI without the jargon.

**Pitch:** All the AI news you care about from YouTube and Reddit in one feed, without the noise.

## Features

- **Beginner-friendly sources:** Curated YouTube channels and Reddit communities focused on practical AI for everyday users
- **Plain-English summaries:** Every item includes a one-line "what this means for you" summary powered by AI
- **Smart filtering:** Filter by source type (Videos/Discussions), sort by Latest or Popular, filter by tags
- **Auto-updated:** New content pulled twice daily (8am & 8pm HKT) via scheduled Edge Functions
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
                         pg_cron (twice daily)
```

**Data Flow:**
1. `pg_cron` triggers the `ingest` Edge Function twice daily (00:00 and 12:00 UTC)
2. Edge Function fetches RSS feeds from YouTube channels
3. Edge Function fetches posts from Reddit (JSON API with OAuth fallback to RSS)
4. New items are upserted to `feed_items` table (dedupe on URL)
5. OpenRouter generates plain-English summaries for new items
6. React frontend reads from Supabase using the publishable key (RLS-protected)

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS 4 + Lucide React
- **Backend:** Supabase (PostgreSQL + Edge Functions + pg_cron)
- **AI:** OpenRouter (configurable model, default: `qwen/qwen3-vl-32b-instruct`)
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
| `OPENROUTER_MODEL` | OpenRouter model ID (see below) | No |
| `REDDIT_CLIENT_ID` | Reddit API OAuth client ID | Recommended* |
| `REDDIT_CLIENT_SECRET` | Reddit API OAuth secret | Recommended* |
| `INGEST_CRON_SECRET` | Secret for cron auth (auto-generated if missing) | Yes |
| `SUPABASE_URL` | Project URL (for cron job) | Yes |
| `SUPABASE_ANON_KEY` | Legacy anon JWT key (for cron job) | Yes |

*Reddit blocks most datacenter IPs by default. Reddit OAuth credentials are strongly recommended. See [Reddit API Setup](#reddit-api-setup) below.

### OpenRouter Model Selection

The default model is `qwen/qwen3-vl-32b-instruct`, which works globally.

**Regional Caveat:** Google and OpenAI models on OpenRouter may return HTTP 403 (Terms of Service violation) when called from certain regions, including Hong Kong and other locations where Supabase Edge Functions may run. If you encounter 403 errors:

1. Check which region your Supabase project is in
2. Use a model that works in that region (Qwen, Claude, Mistral, etc.)
3. Override the default by adding `OPENROUTER_MODEL` to Vault:

```sql
SELECT vault.create_secret('qwen/qwen3-vl-32b-instruct', 'OPENROUTER_MODEL');
-- Or use another model like 'anthropic/claude-3-haiku', 'mistralai/mistral-small', etc.
```

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
- `20260930000002_setup_ingest_cron.sql` - pg_cron job for scheduled ingestion (uses `net.http_post`)
- `20260930000003_add_hidden_column.sql` - Adds `hidden` column to filter low-relevance items
- `20260930000004_update_cron_schedule.sql` - Updates schedule to twice daily (00:00 and 12:00 UTC)

### 3. Add Vault Secrets

Before running the cron migration, add these secrets to Vault:

```sql
-- In Supabase SQL Editor
SELECT vault.create_secret('https://gmfzwuunaqzutbhudsxn.supabase.co', 'SUPABASE_URL');
SELECT vault.create_secret('your-anon-key', 'SUPABASE_ANON_KEY');
SELECT vault.create_secret('sb_publishable_...', 'SUPABASE_PUBLISHABLE_KEY');
SELECT vault.create_secret('your-openrouter-api-key', 'OPENROUTER_API_KEY');
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy ingest --verify-jwt
```

**`keyword-videos` (YouTube discovery for trending chips):** JWT verification must be **off** at the gateway (publishable keys are not JWTs). The function validates the `apikey` header against **`SUPABASE_PUBLISHABLE_KEY`** (same value as `VITE_SUPABASE_PUBLISHABLE_KEY` on Vercel) **or** legacy **`SUPABASE_ANON_KEY`** (function env or Vault). Deploy with:

```bash
supabase functions deploy keyword-videos --no-verify-jwt
```

(`supabase/config.toml` sets `[functions.keyword-videos] verify_jwt = false` for local CLI deploys.)

Apply migration `20261003000012_keyword_video_daily_quota.sql` before deploying `keyword-videos` (daily uncached search cap).

**Launch batch (PR #4, apply in order after `20261003000013`):**

1. `20261004000001_feed_story_groups.sql`
2. `20261004000002_feed_items_is_ai_related.sql`
3. `20261004000003_subscribers_attribution.sql`
4. `20261004000004_feed_story_leads_view.sql`
5. `20261004000005_feed_items_backfill_markers.sql`

Then redeploy **`ingest`** and **`weekly-recap`**. Backfills (POST + `x-cron-secret`; repeat each until `remaining` is 0):

```bash
# 1) Dry-run AI classification (optional; does not write markers)
curl -X POST "$SUPABASE_URL/functions/v1/ingest" \
  -H "x-cron-secret: $INGEST_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode":"backfill_ai_related","dry_run":true,"limit":40}'

# 2) Classify + regenerate summaries/keywords (sets ai_classified_at + summary_regenerated_at; hides non-AI)
curl -X POST "$SUPABASE_URL/functions/v1/ingest" \
  -H "x-cron-secret: $INGEST_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode":"backfill_ai_related","limit":40}'

# 3) Optional: summary-only regen for rows not touched by step 2 (usually skip if step 2 completed)
curl -X POST "$SUPABASE_URL/functions/v1/ingest" \
  -H "x-cron-secret: $INGEST_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode":"backfill_summaries","limit":40}'

# 4) Story grouping (±72h window per item; incremental via story_grouped_at)
curl -X POST "$SUPABASE_URL/functions/v1/ingest" \
  -H "x-cron-secret: $INGEST_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"mode":"backfill_story_groups","limit":40}'
```

**Darwin (Vercel):** enable Web Analytics in the project dashboard; custom `track()` events need Pro.

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

## Reddit API Setup

Reddit blocks requests from most datacenter IPs by default, including Supabase Edge Functions. You will see 403 errors for Reddit sources without OAuth credentials.

**To enable Reddit ingestion:**

1. **Create a Reddit App:**
   - Go to https://www.reddit.com/prefs/apps
   - Click "create another app..." at the bottom
   - Select **"script"** as the app type
   - Name: `ai-news-feed` (or any name)
   - Redirect URI: `http://localhost` (not used for script apps)
   - Click "create app"

2. **Get your credentials:**
   - **Client ID:** The string under "personal use script" (e.g., `abc123XYZ`)
   - **Client Secret:** The "secret" field

3. **Add to Supabase Vault:**
   ```sql
   SELECT vault.create_secret('your-client-id', 'REDDIT_CLIENT_ID');
   SELECT vault.create_secret('your-client-secret', 'REDDIT_CLIENT_SECRET');
   ```

4. **Redeploy the function** (if already deployed):
   ```bash
   supabase functions deploy ingest --verify-jwt
   ```

The Edge Function will automatically use OAuth (`oauth.reddit.com`) when credentials are present, which bypasses the IP-based blocking.

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
