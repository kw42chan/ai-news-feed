-- Seed default sources: YouTube channels and Reddit subreddits
-- All YouTube channel IDs verified via RSS feed fetch on 2026-09-30

INSERT INTO public.sources (kind, external_id, name, url, description, tags) VALUES
  -- YouTube Channels (verified RSS feeds)
  ('youtube', 'UChpleBmo18P08aKCIgti38g', 'Matt Wolfe', 'https://www.youtube.com/@mreflow', 'Sifting through AI noise to share what matters. Covers AI tools, news, and practical applications.', ARRAY['tools', 'work & productivity']),
  ('youtube', 'UCHhYXsLBEVVnbvsq57n1MTQ', 'The AI Advantage', 'https://www.youtube.com/@aiadvantage', 'Practical AI tutorials and weekly updates you can actually use.', ARRAY['tools', 'how-to', 'work & productivity']),
  ('youtube', 'UCNJ1Ymd5yFuUPtn21xtRbbw', 'AI Explained', 'https://www.youtube.com/@aiexplained-official', 'Covers the biggest AI news with clear explanations. Creator of Simple Bench.', ARRAY['big tech', 'policy & safety']),
  ('youtube', 'UCfJT_eYDTmDE-ovKaxVE1ig', 'Kevin Stratvert', 'https://www.youtube.com/@KevinStratvert', 'AI and productivity tool tutorials with step-by-step guides for ChatGPT, Copilot, and more.', ARRAY['how-to', 'tools', 'work & productivity']),
  ('youtube', 'UCwAnu01qlnVg1Ai2AbtTMaA', 'Jeff Su', 'https://www.youtube.com/@JeffSu', 'Ex-Google product marketer sharing AI and productivity tips for professionals.', ARRAY['work & productivity', 'tools']),
  ('youtube', 'UC2UXDak6o7rBm23k3Vv5dww', 'Tina Huang', 'https://www.youtube.com/@TinaHuang1', 'Ex-Meta data scientist covering AI, coding, and career topics with minimal effort approach.', ARRAY['how-to', 'creative', 'work & productivity']),
  ('youtube', 'UCqcbQf6yw5KzRoDDcZ_wBSw', 'Wes Roth', 'https://www.youtube.com/@WesRoth', 'AI news and analysis with an optimistic lens. Covers OpenAI, Anthropic, Google DeepMind.', ARRAY['big tech', 'policy & safety']),
  
  -- Reddit Subreddits (beginner-friendly AI discussions)
  ('reddit', 'ChatGPT', 'r/ChatGPT', 'https://www.reddit.com/r/ChatGPT/', 'Discussions about ChatGPT usage, tips, and news.', ARRAY['tools', 'how-to']),
  ('reddit', 'OpenAI', 'r/OpenAI', 'https://www.reddit.com/r/OpenAI/', 'News and discussion about OpenAI products and announcements.', ARRAY['big tech', 'tools']),
  ('reddit', 'artificial', 'r/artificial', 'https://www.reddit.com/r/artificial/', 'General AI news and discussion for a broad audience.', ARRAY['big tech', 'policy & safety', 'business'])
ON CONFLICT (kind, external_id) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  updated_at = now();
