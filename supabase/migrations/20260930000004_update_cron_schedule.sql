-- Update ingest cron job schedule from every 20 minutes to twice daily
-- Runs at 00:00 and 12:00 UTC (8am and 8pm Hong Kong time)
-- Safe to re-run: cron.alter_job is idempotent for schedule changes

SELECT cron.alter_job(
  job_name := 'ingest-feed-items',
  schedule := '0 0,12 * * *'
);
