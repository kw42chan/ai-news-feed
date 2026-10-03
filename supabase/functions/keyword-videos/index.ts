import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_KEYWORD_LENGTH = 60;
const TRENDING_ALLOWLIST_MAX = 12;
const DAILY_UNCACHED_SEARCH_CAP = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const inflightSearches = new Map<string, Promise<YouTubeSearchItem[]>>();

async function getAppSecret(
  supabase: ReturnType<typeof createClient>,
  secretName: string
): Promise<string | null> {
  const envValue = Deno.env.get(secretName);
  if (envValue) return envValue;

  const { data, error } = await supabase.rpc("get_app_secret", {
    secret_name: secretName,
  });
  if (error) return null;
  return data;
}

async function getExpectedClientApiKey(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const envAnon = Deno.env.get("SUPABASE_ANON_KEY");
  if (envAnon) return envAnon;

  const vaultAnon = await getAppSecret(supabase, "SUPABASE_ANON_KEY");
  if (vaultAnon) return vaultAnon;

  return await getAppSecret(supabase, "SUPABASE_PUBLISHABLE_KEY");
}

function isValidClientKey(req: Request, expectedKey: string | null): boolean {
  if (!expectedKey) return false;
  const apikey = req.headers.get("apikey");
  return apikey === expectedKey;
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function youtubeWatchUrls(videoId: string): string[] {
  return [
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
  ];
}

async function isKeywordAllowed(
  supabase: ReturnType<typeof createClient>,
  normalized: string
): Promise<boolean> {
  const { data: trending, error: trendingError } = await supabase.rpc("trending_keywords", {
    days: 7,
    max_count: TRENDING_ALLOWLIST_MAX,
  });

  if (trendingError || !Array.isArray(trending)) return false;

  for (const row of trending) {
    if (typeof row.keyword === "string" && normalizeKeyword(row.keyword) === normalized) {
      return true;
    }
  }
  return false;
}

function cacheTtlMs(results: unknown): number {
  if (!Array.isArray(results) || results.length === 0) {
    return FAILURE_CACHE_TTL_MS;
  }
  return CACHE_TTL_MS;
}

async function readCache(
  supabase: ReturnType<typeof createClient>,
  normalized: string
): Promise<YouTubeSearchItem[] | null> {
  const { data: cached } = await supabase
    .from("keyword_video_cache")
    .select("results, fetched_at")
    .eq("keyword", normalized)
    .maybeSingle();

  if (!cached?.fetched_at || !Array.isArray(cached.results)) return null;

  const age = Date.now() - new Date(cached.fetched_at).getTime();
  if (age >= cacheTtlMs(cached.results)) return null;

  return cached.results as YouTubeSearchItem[];
}

async function writeCache(
  supabase: ReturnType<typeof createClient>,
  normalized: string,
  videos: YouTubeSearchItem[]
): Promise<void> {
  await supabase.from("keyword_video_cache").upsert(
    {
      keyword: normalized,
      results: videos,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "keyword" }
  );
}

function utcDayString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getDailyUncachedCount(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  const day = utcDayString();
  const { data } = await supabase
    .from("keyword_video_daily_quota")
    .select("uncached_searches")
    .eq("day", day)
    .maybeSingle();

  return data?.uncached_searches ?? 0;
}

async function incrementDailyUncachedCount(
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const day = utcDayString();
  const current = await getDailyUncachedCount(supabase);
  await supabase.from("keyword_video_daily_quota").upsert(
    { day, uncached_searches: current + 1 },
    { onConflict: "day" }
  );
}

async function feedVideoIdsAmongCandidates(
  supabase: ReturnType<typeof createClient>,
  candidateIds: string[]
): Promise<Set<string>> {
  if (candidateIds.length === 0) return new Set();

  const urls = candidateIds.flatMap((id) => youtubeWatchUrls(id));
  const { data } = await supabase
    .from("feed_items")
    .select("url")
    .eq("source", "youtube")
    .eq("hidden", false)
    .in("url", urls);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (typeof row.url === "string") {
      const id = extractYouTubeVideoId(row.url);
      if (id) ids.add(id);
    }
  }
  return ids;
}

interface YouTubeSearchItem {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
}

async function fetchYouTubeSearch(
  supabase: ReturnType<typeof createClient>,
  trimmed: string,
  youtubeApiKey: string
): Promise<YouTubeSearchItem[]> {
  const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set(
    "fields",
    "items(id/videoId,snippet(title,channelTitle,publishedAt,thumbnails/medium/url,thumbnails/default/url))"
  );
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("publishedAfter", publishedAfter);
  searchUrl.searchParams.set("relevanceLanguage", "en");
  searchUrl.searchParams.set("safeSearch", "moderate");
  searchUrl.searchParams.set("maxResults", "10");
  searchUrl.searchParams.set("q", trimmed);
  searchUrl.searchParams.set("key", youtubeApiKey);

  const searchResponse = await fetch(searchUrl.toString());
  if (!searchResponse.ok) {
    console.error("YouTube search error:", searchResponse.status, await searchResponse.text());
    return [];
  }

  const searchData = await searchResponse.json();
  const items = searchData?.items ?? [];
  const candidateIds: string[] = [];

  for (const item of items) {
    const videoId = item?.id?.videoId;
    if (videoId) candidateIds.push(videoId);
  }

  const feedVideoIds = await feedVideoIdsAmongCandidates(supabase, candidateIds);

  const videos: YouTubeSearchItem[] = [];
  for (const item of items) {
    const videoId = item?.id?.videoId;
    const snippet = item?.snippet;
    if (!videoId || !snippet || feedVideoIds.has(videoId)) continue;

    videos.push({
      videoId,
      title: snippet.title ?? "YouTube video",
      channelTitle: snippet.channelTitle ?? "",
      publishedAt: snippet.publishedAt ?? "",
      thumbnail:
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
  }

  return videos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expectedClientKey = await getExpectedClientApiKey(supabase);
    if (!isValidClientKey(req, expectedClientKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let keyword = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      keyword = url.searchParams.get("keyword") ?? "";
    } else {
      const body = await req.json().catch(() => ({}));
      keyword = typeof body.keyword === "string" ? body.keyword : "";
    }

    const trimmed = keyword.trim();
    if (!trimmed || trimmed.length > MAX_KEYWORD_LENGTH) {
      return new Response(JSON.stringify({ error: "Invalid keyword" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = normalizeKeyword(trimmed);
    const allowed = await isKeywordAllowed(supabase, normalized);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Keyword not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cachedVideos = await readCache(supabase, normalized);
    if (cachedVideos !== null) {
      return new Response(JSON.stringify({ videos: cachedVideos, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyCount = await getDailyUncachedCount(supabase);
    if (dailyCount >= DAILY_UNCACHED_SEARCH_CAP) {
      return new Response(JSON.stringify({ error: "Daily search limit reached" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const youtubeApiKey = await getAppSecret(supabase, "YOUTUBE_API_KEY");
    if (!youtubeApiKey) {
      return new Response(JSON.stringify({ error: "YouTube API not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let videos: YouTubeSearchItem[];
    const inflight = inflightSearches.get(normalized);
    if (inflight) {
      videos = await inflight;
    } else {
      const promise = fetchYouTubeSearch(supabase, trimmed, youtubeApiKey).finally(() => {
        inflightSearches.delete(normalized);
      });
      inflightSearches.set(normalized, promise);
      videos = await promise;
      await incrementDailyUncachedCount(supabase);
      await writeCache(supabase, normalized, videos);
    }

    return new Response(JSON.stringify({ videos, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("keyword-videos error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", videos: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
