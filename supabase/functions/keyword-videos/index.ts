import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_KEYWORD_LENGTH = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

async function isKeywordAllowed(
  supabase: ReturnType<typeof createClient>,
  normalized: string
): Promise<boolean> {
  const { data: trending, error: trendingError } = await supabase.rpc("trending_keywords", {
    days: 7,
    max_count: 50,
  });

  if (!trendingError && Array.isArray(trending)) {
    for (const row of trending) {
      if (typeof row.keyword === "string" && normalizeKeyword(row.keyword) === normalized) {
        return true;
      }
    }
  }

  const { data: glossaryRows } = await supabase.from("glossary").select("term, aliases");
  for (const row of glossaryRows ?? []) {
    if (typeof row.term === "string" && normalizeKeyword(row.term) === normalized) {
      return true;
    }
    for (const alias of row.aliases ?? []) {
      if (typeof alias === "string" && normalizeKeyword(alias) === normalized) {
        return true;
      }
    }
  }

  return false;
}

interface YouTubeSearchItem {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: cached } = await supabase
      .from("keyword_video_cache")
      .select("results, fetched_at")
      .eq("keyword", normalized)
      .maybeSingle();

    if (cached?.fetched_at) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS && Array.isArray(cached.results)) {
        return new Response(JSON.stringify({ videos: cached.results, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const youtubeApiKey = await getAppSecret(supabase, "YOUTUBE_API_KEY");
    if (!youtubeApiKey) {
      return new Response(JSON.stringify({ error: "YouTube API not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
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
      return new Response(JSON.stringify({ videos: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResponse.json();
    const items = searchData?.items ?? [];

    const { data: feedUrls } = await supabase
      .from("feed_items")
      .select("url")
      .eq("source", "youtube")
      .eq("hidden", false);

    const feedVideoIds = new Set<string>();
    for (const row of feedUrls ?? []) {
      if (typeof row.url === "string") {
        const id = extractYouTubeVideoId(row.url);
        if (id) feedVideoIds.add(id);
      }
    }

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

    await supabase.from("keyword_video_cache").upsert(
      {
        keyword: normalized,
        results: videos,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "keyword" }
    );

    return new Response(JSON.stringify({ videos, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error), videos: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
