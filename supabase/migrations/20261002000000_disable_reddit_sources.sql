-- Disable Reddit sources for YouTube-only launch
-- Reddit ingestion code remains in place for future use
-- Safe to re-run: idempotent update

UPDATE public.sources SET enabled = false WHERE kind = 'reddit';
