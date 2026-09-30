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
  relevant?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-cron-secret, content-type",
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
  const channelName = channelNameMatch ? channelNameMatch[1] : "Unknown";

  const entryRegex =
    /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entry = entryMatch[1];

    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const authorMatch = entry.match(/<name>([^<]+)<\/name>/);
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/);
    const thumbnailMatch = entry.match(
      /<media:thumbnail[^>]+url="([^"]+)"/
    );
    const viewsMatch = entry.match(
      /<media:statistics[^>]+views="(\d+)"/
    );

    if (videoIdMatch && titleMatch && publishedMatch) {
      const videoId = videoIdMatch[1];
      const url =
        linkMatch?.[1] || `https://www.youtube.com/watch?v=${videoId}`;
      
      // Skip Shorts (URL contains /shorts/)
      if (url.includes("/shorts/")) {
        continue;
      }

      items.push({
        source: "youtube",
        source_id: "", // Will be set later
        source_name: channelName,
        author: authorMatch?.[1] || channelName,
        title: titleMatch[1],
        url,
        thumbnail:
          thumbnailMatch?.[1] ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
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
    const response = await fetch(
      "https://www.reddit.com/api/v1/access_token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "web:ai-news-feed:v0.1 (by /u/ai-news-feed-bot)",
        },
        body: "grant_type=client_credentials",
      }
    );

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
  let response: Response;
  let useOAuth = false;

  if (oauthToken) {
    // Try OAuth endpoint first
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
    // Try public JSON endpoint
    response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`,
      {
        headers: { "User-Agent": userAgent },
      }
    );

    if (!response.ok) {
      // Try RSS as fallback
      const rssResponse = await fetch(
        `https://www.reddit.com/r/${subreddit}/.rss`,
        { headers: { "User-Agent": userAgent } }
      );

      if (!rssResponse.ok) {
        return {
          items: [],
          error: `Reddit blocked (${response.status}). Consider adding REDDIT_CLIENT_ID/SECRET.`,
        };
      }

      // Parse RSS fallback
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
            title: titleMatch[1],
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

      // Skip stickied, NSFW, or removed posts
      if (p.stickied || p.over_18 || p.removed_by_category) {
        continue;
      }

      items.push({
        source: "reddit",
        source_id: "",
        source_name: `r/${subreddit}`,
        author: p.author || null,
        title: p.title,
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

async function generateSummary(
  title: string,
  sourceName: string,
  apiKey: string,
  model: string
): Promise<SummaryResponse | null> {
  const prompt = `You are a helpful assistant summarizing AI news for non-technical professionals.

For the following content, provide:
1. A ONE plain-English sentence (max 25 words) explaining "what this means for you" - no jargon, no hype, just practical impact
2. 1-3 tags from this list: ${VALID_TAGS.join(", ")}
3. A relevance flag (true if it's actually about AI/tech for general audiences, false for memes/low-effort/irrelevant content)

Content Title: "${title}"
Source: ${sourceName}

Respond in JSON only:
{"summary": "...", "tags": ["...", "..."], "relevant": true/false}`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
          max_tokens: 200,
        }),
      }
    );

    if (!response.ok) {
      console.error("OpenRouter error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    // Parse JSON defensively
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Filter tags to only valid ones
    const validTags = (parsed.tags || []).filter((t: string) =>
      VALID_TAGS.includes(t as typeof VALID_TAGS[number])
    );

    return {
      summary: parsed.summary || null,
      tags: validTags.slice(0, 3),
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let itemsNew = 0;
  let itemsSummarized = 0;
  const details: Record<string, unknown> = { sources: {} };

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify cron secret if present (cron calls include it, manual calls may not)
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret) {
      const expectedSecret = await getAppSecret(supabase, "INGEST_CRON_SECRET");
      if (expectedSecret && cronSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get OpenRouter config
    const openRouterKey = await getAppSecret(supabase, "OPENROUTER_API_KEY");
    const openRouterModel =
      (await getAppSecret(supabase, "OPENROUTER_MODEL")) ||
      "google/gemini-2.0-flash-lite-001";

    // Get Reddit OAuth credentials if available
    const redditClientId = await getAppSecret(supabase, "REDDIT_CLIENT_ID");
    const redditClientSecret = await getAppSecret(
      supabase,
      "REDDIT_CLIENT_SECRET"
    );
    let redditOAuthToken: string | null = null;
    if (redditClientId && redditClientSecret) {
      redditOAuthToken = await getRedditOAuthToken(
        redditClientId,
        redditClientSecret
      );
    }

    // Fetch enabled sources
    const { data: sources, error: sourcesError } = await supabase
      .from("sources")
      .select("*")
      .eq("enabled", true);

    if (sourcesError) throw sourcesError;

    const allItems: FeedItem[] = [];

    // Process each source
    for (const source of sources as Source[]) {
      const sourceDetails: Record<string, unknown> = {};

      try {
        let items: FeedItem[] = [];
        let sourceError: string | undefined;

        if (source.kind === "youtube") {
          items = await fetchYouTubeFeed(source.external_id);
        } else if (source.kind === "reddit") {
          const result = await fetchRedditFeed(
            source.external_id,
            redditOAuthToken
          );
          items = result.items;
          sourceError = result.error;
        }

        // Set source_id for all items
        items = items.map((item) => ({ ...item, source_id: source.id }));
        allItems.push(...items);

        sourceDetails.fetched = items.length;
        if (sourceError) {
          sourceDetails.error = sourceError;
          // Update source with error
          await supabase
            .from("sources")
            .update({ last_error: sourceError, last_fetched_at: new Date().toISOString() })
            .eq("id", source.id);
        } else {
          // Clear any previous error
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

      details.sources[source.name] = sourceDetails;
    }

    // Upsert all items
    if (allItems.length > 0) {
      const { data: upserted, error: upsertError } = await supabase
        .from("feed_items")
        .upsert(
          allItems.map((item) => ({
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
        )
        .select("id, url");

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      } else {
        itemsNew = upserted?.length || 0;
      }
    }

    // Generate summaries for items without them
    if (openRouterKey) {
      const { data: unsummarized } = await supabase
        .from("feed_items")
        .select("id, title, source_name")
        .is("summary", null)
        .order("created_at", { ascending: false })
        .limit(MAX_SUMMARIES_PER_RUN);

      if (unsummarized && unsummarized.length > 0) {
        await processSummariesInBatches(
          unsummarized,
          async (item) => {
            const result = await generateSummary(
              item.title,
              item.source_name,
              openRouterKey,
              openRouterModel
            );

            if (result && result.relevant !== false) {
              await supabase
                .from("feed_items")
                .update({
                  summary: result.summary,
                  tags: result.tags,
                  summary_model: openRouterModel,
                  summarized_at: new Date().toISOString(),
                })
                .eq("id", item.id);
              itemsSummarized++;
            } else if (result && result.relevant === false) {
              // Mark irrelevant content
              await supabase
                .from("feed_items")
                .update({
                  summary: "(filtered as low-relevance)",
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

    // Record ingest run
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Ingest error:", error);

    // Try to record failed run
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

    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
