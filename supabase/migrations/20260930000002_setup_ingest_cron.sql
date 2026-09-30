-- Setup cron job to call the ingest Edge Function every 20 minutes
-- Secrets (SUPABASE_URL, SUPABASE_ANON_KEY, INGEST_CRON_SECRET) must be added to Vault before this migration runs

-- Create the cron secret if it doesn't exist (operator should set a real secret value)
-- This is a placeholder - the operator must update this with a real random secret
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'INGEST_CRON_SECRET') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'INGEST_CRON_SECRET',
      'Secret for authenticating cron-triggered Edge Function calls'
    );
  END IF;
END $$;

-- Schedule the ingest function to run every 20 minutes
-- Uses pg_net (net schema) to make HTTP request to the Edge Function
-- timeout_milliseconds set to 150000 (2.5 min) as pg_net's 5s default is too short
SELECT cron.schedule(
  'ingest-feed-items',
  '*/20 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'INGEST_CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

-- Note: Before running this migration, add these secrets to Vault:
-- 1. SUPABASE_URL: https://gmfzwuunaqzutbhudsxn.supabase.co
-- 2. SUPABASE_ANON_KEY: the anon/publishable key (legacy JWT)
-- 3. INGEST_CRON_SECRET: a random secret string (auto-generated above if missing)
