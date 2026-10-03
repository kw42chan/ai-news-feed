import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VALID_TAGS = [
  "tools",
  "work & productivity",
  "business",
  "policy & safety",
  "big tech",
  "how-to",
  "creative",
] as const;

const MAX_SUMMARIES_PER_RUN = 40;
const SUMMARY_CONCURRENCY = 5;
const GLOSSARY_MAX_PER_RUN = 5;
const GLOSSARY_TIMEOUT_MS = 8000;

// Default model: qwen works globally; Google/OpenAI models may return 403 in some regions (e.g. Hong Kong)
// Override via OPENROUTER_MODEL Vault secret
const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3-vl-32b-instruct";

const PROFESSIONAL_ROLES = [
  "Marketing",
  "Sales",
  "Finance",
  "HR & People",
  "Operations",
  "Founder / Leadership",
  "Other",
] as const;

interface Source {
  id: string;
  kind: "youtube" | "reddit" | "x";
  external_id: string;
  name: string;
  url: string | null;
  tags: string[];
  enabled: boolean;
}

interface FeedItem {
  source: string;
  source_id: string;
  source_name: string;
  author: string | null;
  title: string;
  url: string;
  thumbnail: string | null;
  published_at: string;
  engagement_score: number;
}

interface SummaryResponse {
  summary: string;
  tags: string[];
  keywords: string[];
  roles: string[];
  try_this: string | null;
  key_points: string[];
  relevant?: boolean;
}

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

async function fetchYouTubeVideoContext(
  videoUrl: string | null | undefined,
  youtubeApiKey: string | null
): Promise<string> {
  if (!videoUrl || !youtubeApiKey) return "";
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) return "";

  try {
    const apiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    apiUrl.searchParams.set("part", "snippet");
    apiUrl.searchParams.set("id", videoId);
    apiUrl.searchParams.set("key", youtubeApiKey);

    const response = await fetch(apiUrl.toString());
    if (!response.ok) return "";

    const data = await response.json();
    const description = data?.items?.[0]?.snippet?.description;
    return typeof description === "string" ? description.trim().slice(0, 4000) : "";
  } catch {
    return "";
  }
}

function normalizeKeyPoints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const points: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim().replace(/^[-•*]\s*/, "");
    if (!trimmed) continue;
    points.push(trimmed.slice(0, 280));
    if (points.length >= 5) break;
  }
  return points.slice(0, 5);
}

const KEYWORD_CANONICAL_LOWER: Record<string, string> = {
  ai: "AI",
  api: "API",
  chatgpt: "ChatGPT",
  deepseek: "DeepSeek",
  iphone: "iPhone",
  llm: "LLM",
  mcp: "MCP",
  nvidia: "NVIDIA",
  openai: "OpenAI",
  youtube: "YouTube",
};

function formatKeywordToken(word: string): string {
  const trimmed = word.trim();
  if (!trimmed) return "";

  const canonical = KEYWORD_CANONICAL_LOWER[trimmed.toLowerCase()];
  if (canonical) return canonical;

  if (/[A-Z]/.test(trimmed) || /\d/.test(trimmed)) {
    return trimmed;
  }

  if (/^gpt-/i.test(trimmed)) {
    return `GPT-${trimmed.slice(4)}`;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function toTitleCaseKeyword(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => formatKeywordToken(word))
    .join(" ");
}

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const match = PROFESSIONAL_ROLES.find((r) => r.toLowerCase() === entry.trim().toLowerCase());
    if (!match || seen.has(match)) continue;
    seen.add(match);
    result.push(match);
    if (result.length >= 3) break;
  }

  return result;
}

function normalizeKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const normalized = toTitleCaseKeyword(entry);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= 3) break;
  }

  return result;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-cron-secret, content-type",
};

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#47;": "/",
  "&nbsp;": " ",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&[#\w]+;/g, (entity) => HTML_ENTITIES[entity] || entity)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function getAppSecret(
  supabase: ReturnType<typeof createClient>,
  secretName: string
): Promise<string | null> {
  const envValue = Deno.env.get(secretName);
  if (envValue) return envValue;

  const { data, error } = await supabase.rpc("get_app_secret", {
    secret_name: secretName,
  });
  if (error) {
    console.error(`Failed to get secret ${secretName}:`, error.message);
    return null;
  }
  return data;
}

async function fetchYouTubeFeed(channelId: string): Promise<FeedItem[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const response = await fetch(feedUrl);
  if (!response.ok) {
    throw new Error(`YouTube feed fetch failed: ${response.status}`);
  }

  const xml = await response.text();
  const items: FeedItem[] = [];

  const channelNameMatch = xml.match(/<name>([^<]+)<\/name>/);
  const channelName = channelNameMatch ? decodeHtmlEntities(channelNameMatch[1]) : "Unknown";

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entry = entryMatch[1];

    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const authorMatch = entry.match(/<name>([^<]+)<\/name>/);
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/);
    const thumbnailMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    const viewsMatch = entry.match(/<media:statistics[^>]+views="(\d+)"/);

    if (videoIdMatch && titleMatch && publishedMatch) {
      const videoId = videoIdMatch[1];
      const url = linkMatch?.[1] || `https://www.youtube.com/watch?v=${videoId}`;

      // Skip Shorts (URL contains /shorts/)
      if (url.includes("/shorts/")) {
        continue;
      }

      items.push({
        source: "youtube",
        source_id: "",
        source_name: channelName,
        author: authorMatch ? decodeHtmlEntities(authorMatch[1]) : channelName,
        title: decodeHtmlEntities(titleMatch[1]),
        url,
        thumbnail: thumbnailMatch?.[1] || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        published_at: publishedMatch[1],
        engagement_score: viewsMatch ? parseInt(viewsMatch[1], 10) : 0,
      });
    }
  }

  return items;
}

async function getRedditOAuthToken(
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  try {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "web:ai-news-feed:v0.1 (by /u/ai-news-feed-bot)",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      console.error("Reddit OAuth failed:", response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Reddit OAuth error:", error);
    return null;
  }
}

async function fetchRedditFeed(
  subreddit: string,
  oauthToken?: string | null
): Promise<{ items: FeedItem[]; error?: string }> {
  const userAgent = "web:ai-news-feed:v0.1 (by /u/ai-news-feed-bot)";
  let response: Response | undefined;
  let useOAuth = false;

  if (oauthToken) {
    try {
      response = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=15`,
        {
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            "User-Agent": userAgent,
          },
        }
      );
      useOAuth = response.ok;
    } catch {
      useOAuth = false;
    }
  }

  if (!useOAuth) {
    response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`,
      { headers: { "User-Agent": userAgent } }
    );

    if (!response.ok) {
      const rssResponse = await fetch(
        `https://www.reddit.com/r/${subreddit}/.rss`,
        { headers: { "User-Agent": userAgent } }
      );

      if (!rssResponse.ok) {
        return {
          items: [],
          error: `Reddit blocked (${response.status}). Add REDDIT_CLIENT_ID/SECRET to Vault for OAuth access.`,
        };
      }

      const xml = await rssResponse.text();
      const items: FeedItem[] = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let entryMatch;

      while ((entryMatch = entryRegex.exec(xml)) !== null) {
        const entry = entryMatch[1];
        const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
        const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/);
        const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/);
        const authorMatch = entry.match(/<name>([^<]+)<\/name>/);

        if (titleMatch && linkMatch && updatedMatch) {
          items.push({
            source: "reddit",
            source_id: "",
            source_name: `r/${subreddit}`,
            author: authorMatch?.[1]?.replace("/u/", "") || null,
            title: decodeHtmlEntities(titleMatch[1]),
            url: linkMatch[1],
            thumbnail: null,
            published_at: updatedMatch[1],
            engagement_score: 0,
          });
        }
      }

      return { items };
    }
  }

  try {
    const data = await response!.json();
    const posts = data?.data?.children || [];
    const items: FeedItem[] = [];

    for (const post of posts) {
      const p = post.data;

      if (p.stickied || p.over_18 || p.removed_by_category) {
        continue;
      }

      items.push({
        source: "reddit",
        source_id: "",
        source_name: `r/${subreddit}`,
        author: p.author || null,
        title: decodeHtmlEntities(p.title || ""),
        url: `https://www.reddit.com${p.permalink}`,
        thumbnail: p.thumbnail?.startsWith("http") ? p.thumbnail : null,
        published_at: new Date(p.created_utc * 1000).toISOString(),
        engagement_score: (p.ups || 0) + (p.num_comments || 0),
      });
    }

    return { items };
  } catch (error) {
    return { items: [], error: `Reddit parse error: ${error}` };
  }
}

async function generateGlossaryDefinition(
  term: string,
  apiKey: string,
  model: string
): Promise<string | null> {
  const prompt = `Write one plain-English sentence (max 22 words) defining this AI term for a busy non-technical professional. No jargon.

Term: "${term}"

Respond in JSON only: {"definition": "..."}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-news-feed.vercel.app",
        "X-Title": "AI News Feed",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 120,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return typeof parsed.definition === "string" ? parsed.definition.trim() : null;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function ensureGlossaryTerms(
  supabase: ReturnType<typeof createClient>,
  keywords: string[],
  apiKey: string,
  model: string,
  glossaryBudget: { remaining: number }
): Promise<void> {
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];

  const tasks = unique.map(async (term) => {
    if (glossaryBudget.remaining <= 0) return;

    const { data: existing } = await supabase
      .from("glossary")
      .select("term")
      .ilike("term", term)
      .maybeSingle();

    if (existing) return;

    const definition = await withTimeout(
      generateGlossaryDefinition(term, apiKey, model),
      GLOSSARY_TIMEOUT_MS
    );
    if (!definition) return;

    glossaryBudget.remaining -= 1;
    await supabase.from("glossary").upsert(
      { term, definition, aliases: [] },
      { onConflict: "term", ignoreDuplicates: true }
    );
  });

  await Promise.all(tasks);
}

async function generateSummary(
  title: string,
  sourceName: string,
  apiKey: string,
  model: string,
  extraContext = ""
): Promise<SummaryResponse | null> {
  const contextBlock = extraContext
    ? `\n\nVideo description or transcript excerpt:\n${extraContext}`
    : "";

  const prompt = `You are a helpful assistant summarizing AI news for non-technical professionals.

For the following content, provide:
1. A ONE plain-English sentence (max 25 words) explaining "what this means for you" - no jargon, no hype, just practical impact
2. 1-3 tags from this list: ${VALID_TAGS.join(", ")}
3. 2-3 short normalized Title Case keywords for trending topics (e.g. "AI Agents", "MCP", "Gemini", "ChatGPT") — product names and concrete AI topics only, no generic words like "News"
4. 0-3 professional roles this story is most relevant to, from exactly this list: ${PROFESSIONAL_ROLES.join(", ")}
5. If this is a how-to or tutorial video, one concrete "try this" action someone can do in about 2 minutes (e.g. "Open ChatGPT and ask it to…"). Otherwise null.
6. 3-5 short plain-English bullet points (key_points): what the video covers and why it matters for work. Each bullet one sentence, no jargon.
7. A relevance flag (true if it's actually about AI/tech for general audiences, false for memes/low-effort/irrelevant content)

Content Title: "${title}"
Source: ${sourceName}${contextBlock}

Respond in JSON only:
{"summary": "...", "tags": ["...", "..."], "keywords": ["...", "..."], "roles": ["..."], "try_this": "..." or null, "key_points": ["...", "..."], "relevant": true/false}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-news-feed.vercel.app",
        "X-Title": "AI News Feed",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const validTags = (parsed.tags || []).filter((t: string) =>
      VALID_TAGS.includes(t as (typeof VALID_TAGS)[number])
    );

    const keywords = normalizeKeywords(parsed.keywords);
    const roles = normalizeRoles(parsed.roles);
    const tryThis =
      typeof parsed.try_this === "string" && parsed.try_this.trim()
        ? parsed.try_this.trim()
        : null;

    const keyPoints = normalizeKeyPoints(parsed.key_points);

    return {
      summary: parsed.summary || null,
      tags: validTags.slice(0, 3),
      keywords,
      roles,
      try_this: tryThis,
      key_points: keyPoints,
      relevant: parsed.relevant !== false,
    };
  } catch (error) {
    console.error("Summary generation error:", error);
    return null;
  }
}

async function processSummariesInBatches<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map(processor));
  }
}

function dedupeByUrl(items: FeedItem[]): FeedItem[] {
  const seen = new Map<string, FeedItem>();
  for (const item of items) {
    if (!seen.has(item.url)) {
      seen.set(item.url, item);
    }
  }
  return Array.from(seen.values());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let itemsNew = 0;
  let itemsSummarized = 0;
  const details: Record<string, unknown> = { sources: {} };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Security: ALWAYS require cron secret header, fail closed if missing
    const cronSecret = req.headers.get("x-cron-secret");
    if (!cronSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: x-cron-secret header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expectedSecret = await getAppSecret(supabase, "INGEST_CRON_SECRET");
    if (!expectedSecret) {
      console.error("INGEST_CRON_SECRET not configured in Vault");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: cron secret not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid cron secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let requestBody: { mode?: string } = {};
    if (req.method === "POST") {
      const rawBody = await req.text();
      if (rawBody) {
        try {
          requestBody = JSON.parse(rawBody) as { mode?: string };
        } catch {
          requestBody = {};
        }
      }
    }

    const openRouterKey = await getAppSecret(supabase, "OPENROUTER_API_KEY");
    const openRouterModel =
      (await getAppSecret(supabase, "OPENROUTER_MODEL")) || DEFAULT_OPENROUTER_MODEL;

    const glossaryBudget = { remaining: GLOSSARY_MAX_PER_RUN };
    const youtubeApiKey = await getAppSecret(supabase, "YOUTUBE_API_KEY");

    if (requestBody.mode === "backfill_keywords") {
      if (!openRouterKey) {
        return new Response(
          JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: needsEnrichment, error: candidatesError } = await supabase
        .from("feed_items")
        .select(
          "id, title, source_name, url, keywords, roles, try_this, key_points, enrich_attempts, enriched_at"
        )
        .eq("hidden", false)
        .not("summary", "is", null)
        .lt("enrich_attempts", 3)
        .or("enriched_at.is.null,key_points.is.null")
        .order("published_at", { ascending: false })
        .limit(MAX_SUMMARIES_PER_RUN);

      if (candidatesError) throw candidatesError;

      let itemsEnriched = 0;
      const batch = needsEnrichment || [];

      if (batch.length > 0) {
        await processSummariesInBatches(
          batch,
          async (item) => {
            const context = await fetchYouTubeVideoContext(item.url, youtubeApiKey);
            const result = await generateSummary(
              item.title,
              item.source_name,
              openRouterKey,
              openRouterModel,
              context
            );

            if (!result) {
              const attempts = (item.enrich_attempts ?? 0) + 1;
              await supabase
                .from("feed_items")
                .update({ enrich_attempts: attempts })
                .eq("id", item.id);
              return;
            }

            const patch: Record<string, unknown> = {};
            if (!item.enriched_at) {
              patch.enriched_at = new Date().toISOString();
            }

            if (!item.keywords?.length && result.keywords.length > 0) {
              patch.keywords = result.keywords;
            }
            if (!item.roles?.length && result.roles.length > 0) {
              patch.roles = result.roles;
            }
            if (
              (item.try_this === null || item.try_this === undefined) &&
              result.try_this
            ) {
              patch.try_this = result.try_this;
            }
            if (!item.key_points || item.key_points.length === 0) {
              if (result.key_points.length > 0) {
                patch.key_points = result.key_points;
              } else {
                patch.key_points = [];
                patch.enrich_attempts = (item.enrich_attempts ?? 0) + 1;
              }
            }

            if (Object.keys(patch).length > 0) {
              await supabase.from("feed_items").update(patch).eq("id", item.id);
            }

            if (result.keywords?.length) {
              await ensureGlossaryTerms(
                supabase,
                result.keywords,
                openRouterKey,
                openRouterModel,
                glossaryBudget
              );
            }
            itemsEnriched++;
          },
          SUMMARY_CONCURRENCY
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "backfill_keywords",
          itemsEnriched,
          durationMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const redditClientId = await getAppSecret(supabase, "REDDIT_CLIENT_ID");
    const redditClientSecret = await getAppSecret(supabase, "REDDIT_CLIENT_SECRET");
    let redditOAuthToken: string | null = null;
    if (redditClientId && redditClientSecret) {
      redditOAuthToken = await getRedditOAuthToken(redditClientId, redditClientSecret);
    }

    const { data: sources, error: sourcesError } = await supabase
      .from("sources")
      .select("*")
      .eq("enabled", true);

    if (sourcesError) throw sourcesError;

    const allItems: FeedItem[] = [];

    for (const source of sources as Source[]) {
      const sourceDetails: Record<string, unknown> = {};

      try {
        let items: FeedItem[] = [];
        let sourceError: string | undefined;

        if (source.kind === "youtube") {
          items = await fetchYouTubeFeed(source.external_id);
        } else if (source.kind === "reddit") {
          const result = await fetchRedditFeed(source.external_id, redditOAuthToken);
          items = result.items;
          sourceError = result.error;
        }

        items = items.map((item) => ({ ...item, source_id: source.id }));
        allItems.push(...items);

        sourceDetails.fetched = items.length;
        if (sourceError) {
          sourceDetails.error = sourceError;
          await supabase
            .from("sources")
            .update({ last_error: sourceError, last_fetched_at: new Date().toISOString() })
            .eq("id", source.id);
        } else {
          await supabase
            .from("sources")
            .update({ last_error: null, last_fetched_at: new Date().toISOString() })
            .eq("id", source.id);
        }
      } catch (error) {
        sourceDetails.error = String(error);
        await supabase
          .from("sources")
          .update({ last_error: String(error), last_fetched_at: new Date().toISOString() })
          .eq("id", source.id);
      }

      (details.sources as Record<string, unknown>)[source.name] = sourceDetails;
    }

    // Dedupe by URL before upsert to avoid "ON CONFLICT cannot affect row a second time"
    const dedupedItems = dedupeByUrl(allItems);

    if (dedupedItems.length > 0) {
      // Get existing URLs to count truly new items
      const urls = dedupedItems.map((item) => item.url);
      const { data: existingItems } = await supabase
        .from("feed_items")
        .select("url")
        .in("url", urls);

      const existingUrls = new Set((existingItems || []).map((i) => i.url));
      const trulyNewCount = dedupedItems.filter((item) => !existingUrls.has(item.url)).length;

      const { error: upsertError } = await supabase.from("feed_items").upsert(
        dedupedItems.map((item) => ({
          source: item.source,
          source_id: item.source_id,
          source_name: item.source_name,
          author: item.author,
          title: item.title,
          url: item.url,
          thumbnail: item.thumbnail,
          published_at: item.published_at,
          engagement_score: item.engagement_score,
        })),
        { onConflict: "url", ignoreDuplicates: false }
      );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      } else {
        itemsNew = trulyNewCount;
      }
    }

    if (openRouterKey) {
      const { data: unsummarized } = await supabase
        .from("feed_items")
        .select("id, title, source_name, url")
        .is("summary", null)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(MAX_SUMMARIES_PER_RUN);

      if (unsummarized && unsummarized.length > 0) {
        await processSummariesInBatches(
          unsummarized,
          async (item) => {
            const context = await fetchYouTubeVideoContext(item.url, youtubeApiKey);
            const result = await generateSummary(
              item.title,
              item.source_name,
              openRouterKey,
              openRouterModel,
              context
            );

            if (result && result.relevant !== false) {
              await supabase
                .from("feed_items")
                .update({
                  summary: result.summary,
                  tags: result.tags,
                  keywords: result.keywords,
                  roles: result.roles,
                  try_this: result.try_this,
                  key_points: result.key_points.length > 0 ? result.key_points : null,
                  summary_model: openRouterModel,
                  summarized_at: new Date().toISOString(),
                  enriched_at: new Date().toISOString(),
                })
                .eq("id", item.id);
              if (result.keywords.length > 0) {
                await ensureGlossaryTerms(
                  supabase,
                  result.keywords,
                  openRouterKey,
                  openRouterModel,
                  glossaryBudget
                );
              }
              itemsSummarized++;
            } else if (result && result.relevant === false) {
              // Hide irrelevant content instead of using placeholder summary
              await supabase
                .from("feed_items")
                .update({
                  hidden: true,
                  summary_model: openRouterModel,
                  summarized_at: new Date().toISOString(),
                })
                .eq("id", item.id);
            }
          },
          SUMMARY_CONCURRENCY
        );
      }
    } else {
      details.warning = "OPENROUTER_API_KEY not configured, skipping summaries";
    }

    const finishedAt = new Date().toISOString();
    await supabase.from("ingest_runs").insert({
      started_at: new Date(startTime).toISOString(),
      finished_at: finishedAt,
      status: "success",
      items_new: itemsNew,
      items_summarized: itemsSummarized,
      details,
    });

    return new Response(
      JSON.stringify({
        success: true,
        itemsNew,
        itemsSummarized,
        durationMs: Date.now() - startTime,
        details,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ingest error:", error);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from("ingest_runs").insert({
        started_at: new Date(startTime).toISOString(),
        finished_at: new Date().toISOString(),
        status: "error",
        items_new: itemsNew,
        items_summarized: itemsSummarized,
        details: { error: String(error), ...details },
      });
    } catch {
      // Ignore logging errors
    }

    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
