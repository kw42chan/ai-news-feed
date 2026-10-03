CREATE TABLE public.glossary (
  term text PRIMARY KEY,
  definition text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.glossary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read glossary" ON public.glossary
  FOR SELECT TO anon, authenticated
  USING (true);

INSERT INTO public.glossary (term, definition, aliases) VALUES
  ('AI agent', 'Software that can take multi-step actions on your behalf, not just answer one question.', '{}'),
  ('MCP', 'A standard way for AI tools to plug into your apps and data safely.', '{"Model Context Protocol"}'),
  ('LLM', 'The large language model behind chatbots like ChatGPT — the engine that reads and writes text.', '{"Large language model"}'),
  ('Prompt', 'The instruction or question you give an AI to get a useful answer.', '{}'),
  ('Chatbot', 'An AI you talk to in a chat window to get answers or draft content.', '{}'),
  ('Copilot', 'Microsoft''s AI assistant built into Office apps and Windows.', '{}'),
  ('Gemini', 'Google''s family of AI models and assistants.', '{}'),
  ('Claude', 'Anthropic''s AI assistant focused on helpful, careful answers.', '{}'),
  ('ChatGPT', 'OpenAI''s popular chatbot for writing, research, and everyday tasks.', '{}'),
  ('GPT', 'OpenAI''s line of language models that power many AI products.', '{}'),
  ('Open source model', 'An AI model whose weights are shared so anyone can run or study it.', '{}'),
  ('Hallucination', 'When an AI states something confidently that is not true.', '{}'),
  ('Context window', 'How much text an AI can read at once in a single conversation.', '{}'),
  ('Fine-tuning', 'Training an existing AI model further for a specific task or company.', '{}'),
  ('RAG', 'Retrieval-augmented generation: the AI looks up documents before answering.', '{"Retrieval augmented generation"}'),
  ('Multimodal', 'An AI that understands more than text, such as images or audio.', '{}'),
  ('Token', 'A small chunk of text the AI counts when measuring length and cost.', '{}'),
  ('API', 'A way for software to request AI features from a provider over the internet.', '{}'),
  ('Automation', 'Using AI or scripts to handle repetitive work with less manual effort.', '{}'),
  ('AGI', 'Artificial general intelligence — AI that could match human-level ability across tasks (still theoretical).', '{"Artificial general intelligence"}'),
  ('Deepfake', 'A fake video or audio clip made to look or sound like a real person.', '{}'),
  ('Voice mode', 'Talking to an AI out loud instead of typing.', '{}'),
  ('Image generation', 'AI that creates pictures from a text description.', '{}'),
  ('Reasoning model', 'An AI tuned to think through harder problems step by step.', '{}'),
  ('AI PC', 'A computer marketed as ready to run AI features locally.', '{}')
ON CONFLICT (term) DO NOTHING;
