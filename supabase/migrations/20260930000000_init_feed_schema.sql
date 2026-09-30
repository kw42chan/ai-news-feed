-- Already applied to project gmfzwuunaqzutbhudsxn (migrations init_feed_schema + move_pg_net_to_extensions_schema)
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('youtube','reddit','x')),
  external_id text not null,
  name text not null,
  url text,
  description text,
  tags text[] not null default '{}',
  is_default boolean not null default true,
  enabled boolean not null default true,
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, external_id)
);

create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('youtube','reddit','x')),
  source_id uuid references public.sources(id) on delete set null,
  source_name text not null,
  author text,
  title text not null,
  url text not null unique,
  thumbnail text,
  published_at timestamptz not null,
  engagement_score numeric not null default 0,
  summary text,
  summary_model text,
  summarized_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feed_items_published_at_idx on public.feed_items (published_at desc);
create index feed_items_source_idx on public.feed_items (source, published_at desc);
create index feed_items_source_id_idx on public.feed_items (source_id);
create index feed_items_tags_idx on public.feed_items using gin (tags);
create index feed_items_unsummarized_idx on public.feed_items (created_at) where summary is null;

create table public.ingest_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text,
  items_new integer default 0,
  items_summarized integer default 0,
  details jsonb
);

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger sources_set_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger feed_items_set_updated_at before update on public.feed_items for each row execute function public.set_updated_at();

alter table public.sources enable row level security;
alter table public.feed_items enable row level security;
alter table public.ingest_runs enable row level security;
create policy "Public can read feed items" on public.feed_items for select to anon, authenticated using (true);
create policy "Public can read enabled sources" on public.sources for select to anon, authenticated using (enabled);

create or replace function public.get_app_secret(secret_name text) returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1; $$;
revoke all on function public.get_app_secret(text) from public, anon, authenticated;
grant execute on function public.get_app_secret(text) to service_role;
