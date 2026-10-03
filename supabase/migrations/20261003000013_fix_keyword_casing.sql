CREATE OR REPLACE FUNCTION public.repair_keyword_token(token text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text := btrim(token);
  lower_t text;
BEGIN
  IF t = '' THEN
    RETURN t;
  END IF;

  lower_t := lower(t);

  CASE lower_t
    WHEN 'chatgpt' THEN RETURN 'ChatGPT';
    WHEN 'openai' THEN RETURN 'OpenAI';
    WHEN 'mcp' THEN RETURN 'MCP';
    WHEN 'llm' THEN RETURN 'LLM';
    WHEN 'api' THEN RETURN 'API';
    WHEN 'nvidia' THEN RETURN 'NVIDIA';
    WHEN 'deepseek' THEN RETURN 'DeepSeek';
    WHEN 'youtube' THEN RETURN 'YouTube';
    WHEN 'iphone' THEN RETURN 'iPhone';
    WHEN 'ai' THEN RETURN 'AI';
    ELSE
      IF lower_t ~ '^gpt-' THEN
        RETURN 'GPT-' || substr(t, 5);
      END IF;
      RETURN t;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.repair_keyword_phrase(phrase text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    string_agg(public.repair_keyword_token(word), ' ' ORDER BY ord),
    ''
  )
  FROM unnest(regexp_split_to_array(btrim(phrase), '\s+')) WITH ORDINALITY AS parts(word, ord)
  WHERE btrim(word) <> '';
$$;

UPDATE public.feed_items fi
SET keywords = sub.repaired
FROM (
  SELECT
    fi2.id,
    ARRAY(
      SELECT DISTINCT public.repair_keyword_phrase(kw)
      FROM unnest(fi2.keywords) AS kw
      WHERE kw IS NOT NULL AND btrim(kw) <> ''
    ) AS repaired
  FROM public.feed_items fi2
  WHERE fi2.keywords IS NOT NULL
    AND cardinality(fi2.keywords) > 0
) sub
WHERE fi.id = sub.id
  AND fi.keywords IS DISTINCT FROM sub.repaired;

CREATE OR REPLACE FUNCTION public.trending_keywords(days int DEFAULT 7, max_count int DEFAULT 12)
RETURNS TABLE(keyword text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (array_agg(kw ORDER BY kw))[1] AS keyword,
    COUNT(*)::bigint AS count
  FROM public.feed_items fi
  CROSS JOIN LATERAL unnest(fi.keywords) AS kw
  WHERE fi.hidden = false
    AND fi.summary IS NOT NULL
    AND fi.source = 'youtube'
    AND fi.published_at >= (now() - make_interval(days => days))
    AND EXISTS (
      SELECT 1
      FROM public.sources s
      WHERE s.id = fi.source_id
        AND s.enabled
    )
    AND kw IS NOT NULL
    AND btrim(kw) <> ''
  GROUP BY lower(btrim(kw))
  ORDER BY count DESC, keyword ASC
  LIMIT GREATEST(max_count, 0);
$$;

REVOKE ALL ON FUNCTION public.trending_keywords(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trending_keywords(int, int) TO anon, authenticated;
