-- Add additional beginner-friendly AI YouTube channels
-- All channel IDs verified via RSS feed fetch on 2026-10-02
-- Latest video dates confirmed within last 2 days

INSERT INTO public.sources (kind, external_id, name, url, description, tags) VALUES
  -- Skill Leap AI: Latest video Oct 1, 2026 "Google Gemini Skills Are Finally Here"
  ('youtube', 'UCwSozl89jl2zUDzQ4jGJD3g', 'Skill Leap AI', 'https://www.youtube.com/@SkillLeapAI', 'AI tools, models, and tips with easy tutorials and reviews. Part of Futurepedia.', ARRAY['tools', 'how-to']),
  
  -- Howfinity: Latest video Sep 30, 2026 "How To Change Your Background on Zoom"  
  ('youtube', 'UCrSvDunJEc1CME4-KvhW_3Q', 'Howfinity', 'https://www.youtube.com/@howfinity', 'Simple, straight-to-the-point tech and AI tutorials. No fluff, just practical guidance.', ARRAY['how-to', 'tools', 'work & productivity']),
  
  -- Leila Gharani: Latest video Oct 1, 2026 "What Actually IS a Pivot Table?"
  ('youtube', 'UCJtUOos_MwJa_Ewii-R3cJA', 'Leila Gharani', 'https://www.youtube.com/@LeilaGharani', 'Microsoft MVP covering Excel, Power BI, Python in Excel, and AI for business professionals.', ARRAY['work & productivity', 'tools', 'how-to']),
  
  -- TheAIGRID: Latest video Oct 1, 2026 "Googles New Gemini 4 Argon is Now The Worlds Smartest AI"
  ('youtube', 'UCbY9xX3_jW5c2fjlZVBI4cg', 'TheAIGRID', 'https://www.youtube.com/@TheAiGrid', 'Latest AI research and developments explained, from practical applications to ethical considerations.', ARRAY['big tech', 'policy & safety'])
  
ON CONFLICT (kind, external_id) DO NOTHING;
