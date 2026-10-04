import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3-vl-32b-instruct";

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
  if (error) return null;
  return data;
}

function getWeekStartHKT(date = new Date()): string {
  const hkt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const day = hkt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  hkt.setUTCDate(hkt.getUTCDate() + diff);
  return hkt.toISOString().slice(0, 10);
}

/** Monday of the week being recapped (previous Mon–Sun when the job runs Monday HKT). */
function getRecapWeekStartHKT(date = new Date()): string {
  const currentMonday = getWeekStartHKT(date);
  const [y, m, d] = currentMonday.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d));
  prev.setUTCDate(prev.getUTCDate() - 7);
  const py = prev.getUTCFullYear();
  const pm = String(prev.getUTCMonth() + 1).padStart(2, "0");
  const pd = String(prev.getUTCDate()).padStart(2, "0");
  return `${py}-${pm}-${pd}`;
}

interface RecapItem {
  headline: string;
  explanation: string;
  why_it_matters: string;
  feed_item_ids: string[];
}

function sanitizeRecapItems(raw: unknown): RecapItem[] {
  if (!Array.isArray(raw)) return [];

  const items: RecapItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const headline =
      typeof record.headline === "string" ? record.headline.trim() : "";
    const explanation =
      typeof record.explanation === "string" ? record.explanation.trim() : "";
    const why_it_matters =
      typeof record.why_it_matters === "string"
        ? record.why_it_matters.trim()
        : "";
    const feed_item_ids = Array.isArray(record.feed_item_ids)
      ? record.feed_item_ids.filter((id): id is string => typeof id === "string")
      : [];

    if (!headline || !explanation || !why_it_matters) continue;
    items.push({ headline, explanation, why_it_matters, feed_item_ids });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cronSecret = req.headers.get("x-cron-secret");
    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedSecret = await getAppSecret(supabase, "INGEST_CRON_SECRET");
    if (!expectedSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openRouterKey = await getAppSecret(supabase, "OPENROUTER_API_KEY");
    if (!openRouterKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model =
      (await getAppSecret(supabase, "OPENROUTER_MODEL")) || DEFAULT_OPENROUTER_MODEL;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: feedItems, error: itemsError } = await supabase
      .from("feed_items")
      .select("id, title, summary, engagement_score, published_at, source, hidden")
      .eq("hidden", false)
      .eq("is_ai_related", true)
      .eq("is_story_lead", true)
      .eq("source", "youtube")
      .not("summary", "is", null)
      .gte("published_at", since)
      .order("engagement_score", { ascending: false })
      .limit(30);

    if (itemsError) throw itemsError;

    const visible = (feedItems || []).filter((item) => item.summary);
    if (visible.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "no_items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storyList = visible
      .slice(0, 20)
      .map(
        (item, i) =>
          `${i + 1}. [${item.id}] ${item.title} — ${item.summary} (${item.engagement_score} views)`
      )
      .join("\n");

    const prompt = `You are writing a weekly "What changed in AI" recap for busy non-technical professionals.

From these stories from the past 7 days, pick the 3-5 biggest shifts. Write in plain English, no jargon.

Stories:
${storyList}

Respond in JSON only:
{
  "title": "short headline for the week",
  "intro": "1-2 sentences setting up the week",
  "items": [
    {
      "headline": "...",
      "explanation": "what happened in plain English",
      "why_it_matters": "why a professional should care",
      "feed_item_ids": ["uuid-from-brackets"]
    }
  ]
}`;

    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-news-feed.vercel.app",
        "X-Title": "AI News Feed",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`OpenRouter error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const content = llmData.choices?.[0]?.message?.content;
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in model response");

    const parsed = JSON.parse(jsonMatch[0]);
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const intro = typeof parsed.intro === "string" ? parsed.intro.trim() : "";
    const recapItems = sanitizeRecapItems(parsed.items);

    if (!title || !intro || recapItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, skipped: "invalid_model_response" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weekStart = getRecapWeekStartHKT();

    const { error: upsertError } = await supabase.from("weekly_recaps").upsert(
      {
        week_start: weekStart,
        title,
        intro,
        items: recapItems,
      },
      { onConflict: "week_start" }
    );

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, week_start: weekStart }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
