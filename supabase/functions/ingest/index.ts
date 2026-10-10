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
const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3.7-plus";

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
  headline: string | null;
  tags: string[];
  keywords: string[];
  roles: string[];
  try_this: string | null;
  key_points: string[];
  is_ai_related: boolean;
  relevant?: boolean;
}

const HEADLINE_MAX_WORDS = 12;

const HEADLINE_INLINE_HYPE_PATTERN =
  /\b(game[- ]?changer|changes everything|you won'?t believe|must[- ]?see|mind[- ]?blowing|unbelievable|insane|shocking)\b/gi;

const HEADLINE_EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

const HEADLINE_RULES_TEXT = `Write one plain-English headline (about 8 words or fewer, sentence case).
Say plainly what happened. Avoid hype (insane, shocking, game-changer, changes everything, etc.).
Do not start with "Just" or "Finally" as clickbait. No exclamation marks, emoji, hashtags, or clickbait questions.
Example: Google releases Gemini 4, its most capable model yet`;

const MAX_HEADLINE_ATTEMPTS = 2;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeHeadlineText(headline: string): string {
  let text = headline
    .trim()
    .replace(HEADLINE_EMOJI_PATTERN, "")
    .replace(/#/g, "")
    .replace(/!/g, "")
    .replace(/\?+$/g, "")
    .replace(HEADLINE_INLINE_HYPE_PATTERN, "")
    .replace(/^just\s+/i, "")
    .replace(/^finally,?\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

/** Returns a storable headline or null (UI falls back to YouTube title). */
function postProcessHeadline(
  raw: string | null | undefined,
  sourceTitle: string
): string | null {
  if (!raw || typeof raw !== "string") return null;

  let headline = sanitizeHeadlineText(raw);
  if (!headline) return null;

  if (headline.toLowerCase() === sourceTitle.trim().toLowerCase()) {
    return null;
  }

  if (countWords(headline) > HEADLINE_MAX_WORDS) {
    headline = headline.split(/\s+/).slice(0, HEADLINE_MAX_WORDS).join(" ");
  }

  if (!headline || countWords(headline) < 2) {
    return null;
  }

  if (headline.includes("?")) {
    return null;
  }

  return headline;
}

async function persistHeadlineResult(
  supabase: ReturnType<typeof createClient>,
  itemId: string,
  headline: string | null,
  currentAttempts = 0
): Promise<void> {
  if (headline) {
    await supabase
      .from("feed_items")
      .update({ headline, headline_attempts: 0 })
      .eq("id", itemId);
    return;
  }

  const nextAttempts = Math.min(currentAttempts + 1, MAX_HEADLINE_ATTEMPTS);
  await supabase
    .from("feed_items")
    .update({ headline: null, headline_attempts: nextAttempts })
    .eq("id", itemId);
}

async function generateHeadlineFromPrompt(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string | null> {
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
        max_tokens: 80,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.headline === "string") return parsed.headline.trim();
    }

    const line = content.split("\n").map((l: string) => l.trim()).find(Boolean);
    return line ?? null;
  } catch {
    return null;
  }
}

async function generateSingleVideoHeadline(
  title: string,
  summary: string,
  apiKey: string,
  model: string
): Promise<string | null> {
  const prompt = `${HEADLINE_RULES_TEXT}

Video title: "${title}"
Summary: ${summary}

Reply JSON only: {"headline": "..."}`;

  const raw = await generateHeadlineFromPrompt(prompt, apiKey, model);
  return postProcessHeadline(raw, title);
}

async function generateGroupStoryHeadline(
  videos: Array<{ title: string; summary: string }>,
  apiKey: string,
  model: string
): Promise<string | null> {
  const fallbackTitle = videos[0]?.title ?? "Story";
  const block = videos
    .map(
      (v, i) =>
        `Video ${i + 1}:\nTitle: ${v.title}\nSummary: ${v.summary}`
    )
    .join("\n\n");

  const prompt = `${HEADLINE_RULES_TEXT}

These YouTube videos cover the SAME news story. Write ONE headline for the shared story (not any single video).

${block}

Reply JSON only: {"headline": "..."}`;

  const raw = await generateHeadlineFromPrompt(prompt, apiKey, model);
  return postProcessHeadline(raw, fallbackTitle);
}

async function fetchStoryGroupMembersForHeadline(
  supabase: ReturnType<typeof createClient>,
  itemId: string
): Promise<Array<{ id: string; title: string; summary: string | null; is_story_lead: boolean }>> {
  const { data: row } = await supabase
    .from("feed_items")
    .select("id, story_group_id, is_story_lead")
    .eq("id", itemId)
    .maybeSingle();

  if (!row) return [];

  const groupKey =
    row.is_story_lead === true ? row.id : (row.story_group_id as string | null) ?? row.id;

  const { data } = await supabase
    .from("feed_items")
    .select("id, title, summary, is_story_lead")
    .or(`id.eq.${groupKey},story_group_id.eq.${groupKey}`)
    .eq("hidden", false);

  return (data ?? []).filter(
    (m): m is { id: string; title: string; summary: string | null; is_story_lead: boolean } =>
      typeof m.id === "string" && typeof m.title === "string"
  );
}

async function regenerateLeadGroupHeadline(
  supabase: ReturnType<typeof createClient>,
  memberItemId: string,
  apiKey: string,
  model: string
): Promise<void> {
  const members = await fetchStoryGroupMembersForHeadline(supabase, memberItemId);
  if (members.length < 2) return;

  const lead = members.find((m) => m.is_story_lead) ?? members[0];
  if (!lead?.id) return;

  const withSummary = members.filter(
    (m): m is { id: string; title: string; summary: string; is_story_lead: boolean } =>
      typeof m.summary === "string" && m.summary.trim().length > 0
  );
  if (withSummary.length < 2) return;

  const { data: leadRow } = await supabase
    .from("feed_items")
    .select("headline_attempts")
    .eq("id", lead.id)
    .maybeSingle();

  const attempts = (leadRow?.headline_attempts as number | undefined) ?? 0;
  if (attempts >= MAX_HEADLINE_ATTEMPTS) return;

  const headline = await generateGroupStoryHeadline(
    withSummary.map((m) => ({ title: m.title, summary: m.summary })),
    apiKey,
    model
  );

  await persistHeadlineResult(supabase, lead.id, headline, attempts);
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

  const lower = trimmed.toLowerCase();
  const canonical = KEYWORD_CANONICAL_LOWER[lower];
  if (canonical) return canonical;

  if (/^gpt-/i.test(trimmed)) {
    return `GPT-${trimmed.slice(4)}`;
  }

  if (/[A-Z]/.test(trimmed) || /\d/.test(trimmed)) {
    return trimmed;
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

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  "ai agents": ["ai agent", "autonomous agents", "agentic ai"],
  "ai agent": ["ai agents", "autonomous agents", "agentic ai"],
  "large language model": ["llm", "large language models"],
  llm: ["large language model", "large language models"],
  "machine learning": ["ml"],
  ml: ["machine learning"],
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordPhraseVariants(keyword: string): string[] {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const variants: string[] = [];

  const add = (phrase: string) => {
    const key = phrase.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    variants.push(phrase);
  };

  add(trimmed);

  const lower = trimmed.toLowerCase();
  for (const synonym of KEYWORD_SYNONYMS[lower] ?? []) {
    add(synonym);
  }

  if (trimmed.endsWith("s") && trimmed.length > 3) {
    add(trimmed.slice(0, -1));
  } else if (!trimmed.endsWith("s")) {
    add(`${trimmed}s`);
  }

  return variants;
}

function phraseMatchesAsWholeWords(text: string, phrase: string): boolean {
  const parts = phrase.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;

  const pattern = parts.map((p) => escapeRegExp(p)).join("\\s+");
  const re = new RegExp(`(?<![A-Za-z0-9])${pattern}(?![A-Za-z0-9])`, "i");
  return re.test(text);
}

function keywordAppearsInSource(keyword: string, title: string, description: string): boolean {
  const hay = `${title}\n${description}`;
  const variants = keywordPhraseVariants(keyword);

  return variants.some((variant) => phraseMatchesAsWholeWords(hay, variant));
}

function filterKeywordsToSource(
  title: string,
  description: string,
  keywords: string[]
): string[] {
  return keywords.filter((kw) => keywordAppearsInSource(kw, title, description));
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

function channelIdToUploadsPlaylistId(channelId: string): string {
  if (channelId.startsWith("UC") && channelId.length > 2) {
    return `UU${channelId.slice(2)}`;
  }
  return channelId;
}

const YOUTUBE_SHORT_MAX_SECONDS = 60;

function parseIso8601DurationSeconds(duration: string): number | null {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

type YouTubeVideoDetails = {
  viewCount: number;
  durationSeconds: number | null;
};

async function fetchYouTubeVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, YouTubeVideoDetails>> {
  const details = new Map<string, YouTubeVideoDetails>();
  if (videoIds.length === 0) return details;

  const apiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  apiUrl.searchParams.set("part", "statistics,contentDetails");
  apiUrl.searchParams.set("id", videoIds.slice(0, 50).join(","));
  apiUrl.searchParams.set("key", apiKey);

  const response = await fetch(apiUrl.toString());
  if (!response.ok) {
    throw new Error(`YouTube videos.list failed: ${response.status}`);
  }

  const data = await response.json();
  for (const row of data?.items ?? []) {
    const id = row?.id;
    if (!id) continue;

    const viewRaw = row?.statistics?.viewCount;
    const viewCount =
      typeof viewRaw === "string" ? parseInt(viewRaw, 10) : Number(viewRaw) || 0;

    const durationRaw = row?.contentDetails?.duration;
    const durationSeconds =
      typeof durationRaw === "string" ? parseIso8601DurationSeconds(durationRaw) : null;

    details.set(id, { viewCount, durationSeconds });
  }

  return details;
}

async function fetchYouTubeFeedViaApi(
  channelId: string,
  channelName: string,
  apiKey: string
): Promise<FeedItem[]> {
  const playlistId = channelIdToUploadsPlaylistId(channelId);
  const apiUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  apiUrl.searchParams.set("part", "snippet,contentDetails");
  apiUrl.searchParams.set("playlistId", playlistId);
  apiUrl.searchParams.set("maxResults", "15");
  apiUrl.searchParams.set("key", apiKey);

  const response = await fetch(apiUrl.toString());
  if (!response.ok) {
    throw new Error(`YouTube playlistItems failed: ${response.status}`);
  }

  const data = await response.json();
  type PlaylistRow = {
    videoId: string;
    snippet: {
      publishedAt: string;
      channelTitle?: string;
      title?: string;
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    };
  };

  const playlistRows: PlaylistRow[] = [];
  for (const row of data?.items ?? []) {
    const videoId = row?.contentDetails?.videoId;
    const snippet = row?.snippet;
    if (!videoId || !snippet?.publishedAt) continue;
    playlistRows.push({ videoId, snippet });
  }

  const videoDetails = await fetchYouTubeVideoDetails(
    playlistRows.map((r) => r.videoId),
    apiKey
  );

  const items: FeedItem[] = [];

  for (const { videoId, snippet } of playlistRows) {
    const meta = videoDetails.get(videoId);
    const durationSeconds = meta?.durationSeconds ?? null;
    if (durationSeconds !== null && durationSeconds <= YOUTUBE_SHORT_MAX_SECONDS) {
      continue;
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    items.push({
      source: "youtube",
      source_id: "",
      source_name: channelName,
      author: snippet.channelTitle ? decodeHtmlEntities(snippet.channelTitle) : channelName,
      title: decodeHtmlEntities(snippet.title ?? "YouTube video"),
      url,
      thumbnail:
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      published_at: snippet.publishedAt,
      engagement_score: meta?.viewCount ?? 0,
    });
  }

  return items;
}

function mergeEngagementScoreForUpsert(
  incoming: number | undefined,
  existing: number | null | undefined
): number {
  const next = incoming ?? 0;
  const prev = existing ?? 0;
  if (next > 0) return next;
  if (prev > 0) return prev;
  return next;
}

async function fetchYouTubeChannelItems(
  channelId: string,
  channelName: string,
  youtubeApiKey: string | null
): Promise<{ items: FeedItem[]; fetchPath: "rss" | "api" }> {
  try {
    const items = await fetchYouTubeFeed(channelId);
    return { items, fetchPath: "rss" };
  } catch (rssError) {
    if (!youtubeApiKey) {
      throw rssError;
    }
    console.warn(
      `YouTube RSS failed for ${channelId}, falling back to Data API:`,
      String(rssError)
    );
    const items = await fetchYouTubeFeedViaApi(channelId, channelName, youtubeApiKey);
    return { items, fetchPath: "api" };
  }
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

Use BOTH the video title and any description/transcript below to write the one-line summary. State what happened clearly — do not hedge (avoid words like "possibly", "might", "may", "could").

For the following content, provide:
1. A ONE plain-English sentence (max 25 words) explaining "what this means for you" - no jargon, no hype, just practical impact
2. 1-3 tags from this list: ${VALID_TAGS.join(", ")}
3. 2-3 short keywords for the specific topics in THIS video only — each must be clearly named or implied in the title/description above (do not invent model versions or copy generic examples). Concrete AI product/topic names only; no generic words like "News"
4. 0-3 professional roles this story is most relevant to, from exactly this list: ${PROFESSIONAL_ROLES.join(", ")}
5. If this is a how-to or tutorial video, one concrete "try this" action someone can do in about 2 minutes (e.g. "Open ChatGPT and ask it to…"). Otherwise null.
6. 3-5 short plain-English bullet points (key_points): what the video covers and why it matters for work. Each bullet one sentence, no jargon.
7. is_ai_related: true if the video is about AI products, models, policy, or meaningful AI at work; false for general Zoom/Excel/productivity tips with no AI angle, memes, or off-topic content
8. headline: ${HEADLINE_RULES_TEXT}

Content Title: "${title}"
Source: ${sourceName}${contextBlock}

Respond in JSON only:
{"summary": "...", "headline": "...", "tags": ["...", "..."], "keywords": ["...", "..."], "roles": ["..."], "try_this": "..." or null, "key_points": ["...", "..."], "is_ai_related": true/false}`;

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

    const keywords = filterKeywordsToSource(
      title,
      extraContext,
      normalizeKeywords(parsed.keywords)
    );
    const roles = normalizeRoles(parsed.roles);
    const tryThis =
      typeof parsed.try_this === "string" && parsed.try_this.trim()
        ? parsed.try_this.trim()
        : null;

    const keyPoints = normalizeKeyPoints(parsed.key_points);

    const isAiRelated =
      parsed.is_ai_related !== false &&
      parsed.is_ai_related !== "false" &&
      parsed.relevant !== false;

    const headline = postProcessHeadline(
      typeof parsed.headline === "string" ? parsed.headline : null,
      title
    );

    return {
      summary: parsed.summary || null,
      headline,
      tags: validTags.slice(0, 3),
      keywords,
      roles,
      try_this: tryThis,
      key_points: keyPoints,
      is_ai_related: isAiRelated,
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

interface StoryLeadCandidate {
  id: string;
  title: string;
  summary: string;
  key_points: string[] | null;
}

async function fetchStoryLeadsNearPublishedAt(
  supabase: ReturnType<typeof createClient>,
  publishedAt: string,
  excludeId?: string
): Promise<StoryLeadCandidate[]> {
  const center = new Date(publishedAt).getTime();
  const windowMs = 72 * 60 * 60 * 1000;
  const since = new Date(center - windowMs).toISOString();
  const until = new Date(center + windowMs).toISOString();

  const { data, error } = await supabase
    .from("feed_items")
    .select("id, title, summary, key_points")
    .eq("is_story_lead", true)
    .eq("hidden", false)
    .eq("is_ai_related", true)
    .not("summary", "is", null)
    .gte("published_at", since)
    .lte("published_at", until)
    .order("published_at", { ascending: false })
    .limit(40);

  if (error || !data) return [];
  return data.filter(
    (row): row is StoryLeadCandidate =>
      typeof row.id === "string" &&
      typeof row.title === "string" &&
      typeof row.summary === "string" &&
      row.id !== excludeId
  );
}

function formatKeyPointsBlock(keyPoints: string[] | null | undefined): string {
  if (!keyPoints?.length) return "(none)";
  return keyPoints.map((p) => `- ${p}`).join("\n");
}

function formatStoryForMatch(
  label: string,
  title: string,
  summary: string,
  keyPoints: string[] | null | undefined
): string {
  return `${label}
Title: ${title}
Summary: ${summary}
Key points:
${formatKeyPointsBlock(keyPoints)}`;
}

async function resolveRootLeadId(
  supabase: ReturnType<typeof createClient>,
  itemId: string
): Promise<string> {
  let current = itemId;
  for (let i = 0; i < 12; i++) {
    const { data } = await supabase
      .from("feed_items")
      .select("id, story_group_id")
      .eq("id", current)
      .maybeSingle();

    if (!data?.story_group_id || data.story_group_id === data.id) {
      return current;
    }
    current = data.story_group_id;
  }
  return current;
}

async function repointSubtreeToRoot(
  supabase: ReturnType<typeof createClient>,
  oldLeadId: string,
  rootId: string
): Promise<void> {
  if (oldLeadId === rootId) return;

  await supabase
    .from("feed_items")
    .update({ story_group_id: rootId, is_story_lead: false })
    .eq("story_group_id", oldLeadId);

  await supabase
    .from("feed_items")
    .update({ story_group_id: rootId, is_story_lead: false })
    .eq("id", oldLeadId);
}

async function matchExistingStoryGroup(
  title: string,
  summary: string,
  keyPoints: string[] | null | undefined,
  candidates: StoryLeadCandidate[],
  apiKey: string,
  model: string
): Promise<string | null> {
  if (candidates.length === 0) return null;

  const list = candidates
    .map(
      (c, i) =>
        `${i + 1}. [${c.id}]\n${formatStoryForMatch("Existing story", c.title, c.summary, c.key_points)}`
    )
    .join("\n\n");

  const prompt = `You decide if a NEW YouTube video belongs in the SAME news story group as an existing story.

STRICT RULES — merge ONLY when both videos cover the SAME specific announcement, event, or product release (same product + same news moment). Default is NO MATCH.

NEVER merge when either video is:
- a tutorial, how-to, tips list, "secrets", beginner guide, walkthrough, or opinion/reaction
- a multi-topic news roundup covering different stories
- only related by shared company or product name (e.g. both mention ChatGPT or Claude but different releases/features)
- a general industry trend piece vs a specific launch

NEW video:
${formatStoryForMatch("NEW", title, summary, keyPoints)}

Existing story candidates (published within ±72 hours of the new video):
${list}

Reply JSON only:
{"match_id": "<uuid from brackets>" | null, "confidence": "high" | "low", "reason": "one short sentence"}

Set match_id only when confidence is "high" and the reason cites the same specific announcement/event. Otherwise match_id must be null.`;

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
        temperature: 0.05,
        max_tokens: 200,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const matchId = parsed.match_id;
    const confidence =
      typeof parsed.confidence === "string" ? parsed.confidence.toLowerCase() : "low";

    if (confidence !== "high" || typeof matchId !== "string" || !matchId) {
      return null;
    }

    const valid = candidates.some((c) => c.id === matchId);
    return valid ? matchId : null;
  } catch {
    return null;
  }
}

async function reelectStoryGroupLead(
  supabase: ReturnType<typeof createClient>,
  groupKey: string
): Promise<void> {
  const { data: members, error } = await supabase
    .from("feed_items")
    .select("id, engagement_score, published_at, story_group_id, hidden, is_ai_related")
    .or(`id.eq.${groupKey},story_group_id.eq.${groupKey}`);

  if (error || !members || members.length === 0) return;

  const eligible = members.filter((m) => m.hidden === false && m.is_ai_related === true);

  if (eligible.length === 0) {
    for (const member of members) {
      await supabase
        .from("feed_items")
        .update({ is_story_lead: false })
        .eq("id", member.id);
    }
    return;
  }

  const sorted = [...eligible].sort((a, b) => {
    const scoreDiff = (b.engagement_score ?? 0) - (a.engagement_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
  });

  const lead = sorted[0];
  if (!lead?.id) return;

  for (const member of members) {
    await supabase
      .from("feed_items")
      .update({
        story_group_id: lead.id,
        is_story_lead: member.id === lead.id,
      })
      .eq("id", member.id);
  }
}

async function assignStoryGroupForItem(
  supabase: ReturnType<typeof createClient>,
  item: {
    id: string;
    title: string;
    summary: string;
    published_at: string;
    key_points?: string[] | null;
  },
  apiKey: string,
  model: string
): Promise<boolean> {
  const candidates = await fetchStoryLeadsNearPublishedAt(
    supabase,
    item.published_at,
    item.id
  );
  const matchId = await matchExistingStoryGroup(
    item.title,
    item.summary,
    item.key_points ?? null,
    candidates,
    apiKey,
    model
  );

  const groupedAt = new Date().toISOString();

  if (!matchId) {
    await supabase
      .from("feed_items")
      .update({
        story_group_id: null,
        is_story_lead: true,
        story_grouped_at: groupedAt,
      })
      .eq("id", item.id);
    return false;
  }

  const rootId = await resolveRootLeadId(supabase, matchId);

  await repointSubtreeToRoot(supabase, matchId, rootId);
  await repointSubtreeToRoot(supabase, item.id, rootId);

  await supabase
    .from("feed_items")
    .update({
      story_group_id: rootId,
      is_story_lead: false,
      story_grouped_at: groupedAt,
    })
    .eq("id", item.id);

  await reelectStoryGroupLead(supabase, rootId);
  await regenerateLeadGroupHeadline(supabase, item.id, apiKey, model);
  return true;
}

function enrichmentPatchFromResult(
  result: SummaryResponse,
  openRouterModel: string,
  options?: { setAiClassifiedAt?: boolean; setSummaryRegeneratedAt?: boolean }
): Record<string, unknown> {
  const now = new Date().toISOString();
  const hidden = !result.is_ai_related || result.relevant === false;

  const patch: Record<string, unknown> = {
    summary: result.summary,
    headline: result.headline,
    tags: result.tags,
    keywords: result.keywords,
    roles: result.roles,
    try_this: result.try_this,
    key_points: result.key_points.length > 0 ? result.key_points : null,
    is_ai_related: result.is_ai_related,
    hidden,
    summary_model: openRouterModel,
    summarized_at: now,
    enriched_at: now,
  };

  if (options?.setAiClassifiedAt) {
    patch.ai_classified_at = now;
  }
  if (options?.setSummaryRegeneratedAt) {
    patch.summary_regenerated_at = now;
  }

  return patch;
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

    let requestBody: { mode?: string; dry_run?: boolean; limit?: number } = {};
    if (req.method === "POST") {
      const rawBody = await req.text();
      if (rawBody) {
        try {
          requestBody = JSON.parse(rawBody) as {
            mode?: string;
            dry_run?: boolean;
            limit?: number;
          };
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

    const backfillLimit = Math.min(requestBody.limit ?? MAX_SUMMARIES_PER_RUN, MAX_SUMMARIES_PER_RUN);

    if (requestBody.mode === "backfill_summaries") {
      if (!openRouterKey) {
        return new Response(
          JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: candidates, error: candidatesError } = await supabase
        .from("feed_items")
        .select("id, title, source_name, url")
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("summary_regenerated_at", null)
        .is("ai_classified_at", null)
        .order("published_at", { ascending: true })
        .limit(backfillLimit);

      if (candidatesError) throw candidatesError;

      let itemsUpdated = 0;
      await processSummariesInBatches(
        candidates || [],
        async (item) => {
          const context = await fetchYouTubeVideoContext(item.url, youtubeApiKey);
          const result = await generateSummary(
            item.title,
            item.source_name,
            openRouterKey,
            openRouterModel,
            context
          );
          if (!result?.summary) return;

          await supabase
            .from("feed_items")
            .update(
              enrichmentPatchFromResult(result, openRouterModel, {
                setSummaryRegeneratedAt: true,
              })
            )
            .eq("id", item.id);

          if (result.is_ai_related && result.keywords.length > 0) {
            await ensureGlossaryTerms(
              supabase,
              result.keywords,
              openRouterKey,
              openRouterModel,
              glossaryBudget
            );
          }
          itemsUpdated++;
        },
        SUMMARY_CONCURRENCY
      );

      const { count: remaining } = await supabase
        .from("feed_items")
        .select("id", { count: "exact", head: true })
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("summary_regenerated_at", null)
        .is("ai_classified_at", null);

      return new Response(
        JSON.stringify({
          success: true,
          mode: "backfill_summaries",
          itemsUpdated,
          remaining: remaining ?? 0,
          note: "Skip if you run backfill_ai_related first (it sets both markers).",
          durationMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requestBody.mode === "backfill_ai_related") {
      if (!openRouterKey) {
        return new Response(
          JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const dryRun = requestBody.dry_run === true;
      const { data: candidates, error: candidatesError } = await supabase
        .from("feed_items")
        .select("id, title, source_name, url, is_ai_related")
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("ai_classified_at", null)
        .order("published_at", { ascending: true })
        .limit(backfillLimit);

      if (candidatesError) throw candidatesError;

      const wouldFilter: { id: string; title: string }[] = [];
      let itemsUpdated = 0;

      await processSummariesInBatches(
        candidates || [],
        async (item) => {
          const context = await fetchYouTubeVideoContext(item.url, youtubeApiKey);
          const result = await generateSummary(
            item.title,
            item.source_name,
            openRouterKey,
            openRouterModel,
            context
          );
          if (!result) return;

          if (!result.is_ai_related || result.relevant === false) {
            wouldFilter.push({ id: item.id, title: item.title });
          }

          if (!dryRun) {
            await supabase
              .from("feed_items")
              .update(
                enrichmentPatchFromResult(result, openRouterModel, {
                  setAiClassifiedAt: true,
                  setSummaryRegeneratedAt: true,
                })
              )
              .eq("id", item.id);
            itemsUpdated++;
          }
        },
        SUMMARY_CONCURRENCY
      );

      const { count: remaining } = await supabase
        .from("feed_items")
        .select("id", { count: "exact", head: true })
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("ai_classified_at", null);

      return new Response(
        JSON.stringify({
          success: true,
          mode: "backfill_ai_related",
          dry_run: dryRun,
          non_ai_count: wouldFilter.length,
          sample_titles: wouldFilter.slice(0, 15).map((r) => r.title),
          itemsUpdated: dryRun ? 0 : itemsUpdated,
          remaining: remaining ?? 0,
          durationMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requestBody.mode === "backfill_headlines") {
      if (!openRouterKey) {
        return new Response(
          JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: candidates, error: candidatesError } = await supabase
        .from("feed_items")
        .select("id, title, summary, story_group_id, is_story_lead, headline_attempts")
        .eq("hidden", false)
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("headline", null)
        .lt("headline_attempts", MAX_HEADLINE_ATTEMPTS)
        .or("story_group_id.is.null,is_story_lead.eq.true")
        .order("published_at", { ascending: true })
        .limit(backfillLimit);

      if (candidatesError) throw candidatesError;

      let itemsUpdated = 0;
      for (const item of candidates || []) {
        if (!item.summary) continue;

        const members = await fetchStoryGroupMembersForHeadline(supabase, item.id);
        const lead = members.find((m) => m.is_story_lead) ?? members[0];

        const attempts = (item.headline_attempts as number | undefined) ?? 0;
        let headline: string | null;

        if (members.length >= 2 && lead?.id === item.id) {
          const withSummary = members.filter(
            (m): m is { title: string; summary: string } =>
              typeof m.summary === "string" && m.summary.trim().length > 0
          );
          if (withSummary.length < 2) {
            headline = await generateSingleVideoHeadline(
              item.title,
              item.summary,
              openRouterKey,
              openRouterModel
            );
          } else {
            headline = await generateGroupStoryHeadline(
              withSummary.map((m) => ({ title: m.title, summary: m.summary })),
              openRouterKey,
              openRouterModel
            );
          }
        } else {
          headline = await generateSingleVideoHeadline(
            item.title,
            item.summary,
            openRouterKey,
            openRouterModel
          );
        }

        await persistHeadlineResult(supabase, item.id, headline, attempts);
        itemsUpdated++;
      }

      const { count: remaining } = await supabase
        .from("feed_items")
        .select("id", { count: "exact", head: true })
        .eq("hidden", false)
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("headline", null)
        .lt("headline_attempts", MAX_HEADLINE_ATTEMPTS)
        .or("story_group_id.is.null,is_story_lead.eq.true");

      return new Response(
        JSON.stringify({
          success: true,
          mode: "backfill_headlines",
          itemsUpdated,
          remaining: remaining ?? 0,
          durationMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requestBody.mode === "backfill_reset_story_groups") {
      const dryRun = requestBody.dry_run === true;

      const { count: toReset, error: countError } = await supabase
        .from("feed_items")
        .select("id", { count: "exact", head: true })
        .eq("source", "youtube");

      if (countError) throw countError;

      if (!dryRun) {
        const { error: resetError } = await supabase
          .from("feed_items")
          .update({
            story_group_id: null,
            is_story_lead: true,
            story_grouped_at: null,
          })
          .eq("source", "youtube");

        if (resetError) throw resetError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "backfill_reset_story_groups",
          dry_run: dryRun,
          itemsReset: dryRun ? 0 : (toReset ?? 0),
          wouldReset: toReset ?? 0,
          durationMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requestBody.mode === "backfill_story_groups") {
      if (!openRouterKey) {
        return new Response(
          JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: candidates, error: candidatesError } = await supabase
        .from("feed_items")
        .select("id, title, summary, published_at, key_points")
        .eq("hidden", false)
        .eq("is_ai_related", true)
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("story_grouped_at", null)
        .order("published_at", { ascending: true })
        .limit(backfillLimit);

      if (candidatesError) throw candidatesError;

      let itemsGrouped = 0;
      let groupHeadlinesUpdated = 0;
      for (const item of candidates || []) {
        if (!item.summary || !item.published_at) continue;
        const joinedGroup = await assignStoryGroupForItem(
          supabase,
          {
            id: item.id,
            title: item.title,
            summary: item.summary,
            published_at: item.published_at,
            key_points: item.key_points,
          },
          openRouterKey,
          openRouterModel
        );
        if (joinedGroup) groupHeadlinesUpdated++;
        itemsGrouped++;
      }

      const { count: remaining } = await supabase
        .from("feed_items")
        .select("id", { count: "exact", head: true })
        .eq("hidden", false)
        .eq("is_ai_related", true)
        .not("summary", "is", null)
        .eq("source", "youtube")
        .is("story_grouped_at", null);

      return new Response(
        JSON.stringify({
          success: true,
          mode: "backfill_story_groups",
          itemsProcessed: itemsGrouped,
          groupHeadlinesUpdated,
          remaining: remaining ?? 0,
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
          const { items: ytItems, fetchPath } = await fetchYouTubeChannelItems(
            source.external_id,
            source.name,
            youtubeApiKey
          );
          items = ytItems;
          sourceDetails.fetchPath = fetchPath;
          console.log(`YouTube ${source.name} (${source.external_id}): ${fetchPath}, ${items.length} items`);
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
        .select("url, engagement_score")
        .in("url", urls);

      const existingByUrl = new Map(
        (existingItems || []).map((i) => [i.url, i.engagement_score as number | null])
      );
      const existingUrls = new Set(existingByUrl.keys());
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
          engagement_score: mergeEngagementScoreForUpsert(
            item.engagement_score,
            existingByUrl.get(item.url)
          ),
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
        .select("id, title, source_name, url, published_at")
        .is("summary", null)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(MAX_SUMMARIES_PER_RUN);

      if (unsummarized && unsummarized.length > 0) {
        const pendingGrouping: Array<{
          id: string;
          title: string;
          summary: string;
          published_at: string;
          key_points: string[] | null;
        }> = [];

        for (let i = 0; i < unsummarized.length; i += SUMMARY_CONCURRENCY) {
          const batch = unsummarized.slice(i, i + SUMMARY_CONCURRENCY);

          await Promise.all(
            batch.map(async (item) => {
              const context = await fetchYouTubeVideoContext(item.url, youtubeApiKey);
              const result = await generateSummary(
                item.title,
                item.source_name,
                openRouterKey,
                openRouterModel,
                context
              );

              if (result && result.summary) {
                await supabase
                  .from("feed_items")
                  .update(enrichmentPatchFromResult(result, openRouterModel))
                  .eq("id", item.id);

                if (result.is_ai_related && result.keywords.length > 0) {
                  await ensureGlossaryTerms(
                    supabase,
                    result.keywords,
                    openRouterKey,
                    openRouterModel,
                    glossaryBudget
                  );
                }

                if (result.is_ai_related && item.published_at) {
                  pendingGrouping.push({
                    id: item.id,
                    title: item.title,
                    summary: result.summary,
                    published_at: item.published_at,
                    key_points:
                      result.key_points.length > 0 ? result.key_points : null,
                  });
                }

                itemsSummarized++;
              }
            })
          );
        }

        pendingGrouping.sort(
          (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
        );

        for (const item of pendingGrouping) {
          await assignStoryGroupForItem(supabase, item, openRouterKey, openRouterModel);
        }
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
