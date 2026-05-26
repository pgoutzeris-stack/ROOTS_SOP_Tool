-- ════════════════════════════════════════════════════════════════
-- ROOTS SOP Tool – Supabase Schema
-- Migration: create_sop_tables
-- Bereits applied: 2026-05-26
-- ════════════════════════════════════════════════════════════════

-- ── 1. TRACKS ──────────────────────────────────────────────────
create table if not exists public.sop_tracks (
  id          uuid        primary key default gen_random_uuid(),
  sort_order  smallint    not null default 0,
  title       text        not null,
  class       text        not null,   -- 'track-pre' | 'track-ops' | 'track-post'
  intro       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2. PHASES ──────────────────────────────────────────────────
create table if not exists public.sop_phases (
  id          uuid        primary key default gen_random_uuid(),
  track_id    uuid        not null references public.sop_tracks(id) on delete cascade,
  sort_order  smallint    not null default 0,
  name        text        not null,
  intro       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sop_phases_track_idx on public.sop_phases(track_id, sort_order);

-- ── 3. CARDS ───────────────────────────────────────────────────
create table if not exists public.sop_cards (
  id          uuid        primary key default gen_random_uuid(),
  phase_id    uuid        not null references public.sop_phases(id) on delete cascade,
  sort_order  smallint    not null default 0,
  name        text        not null,
  intro       text,
  description text,                   -- Markdown / Richtext
  status      text        not null default 'active' check (status in ('active','archived')),
  tags        text[]      not null default '{}',
  attachments jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sop_cards_phase_idx on public.sop_cards(phase_id, sort_order);

-- ── 4. REVISIONS (Versionsverlauf / Audit Trail) ───────────────
create table if not exists public.sop_revisions (
  id          uuid        primary key default gen_random_uuid(),
  author_name text        not null,
  author_id   uuid        references auth.users(id) on delete set null,
  label       text,
  snapshot    jsonb       not null,   -- vollständiger SOP-Baum (Track→Phase→Card)
  created_at  timestamptz not null default now()
);
create index if not exists sop_revisions_created_idx on public.sop_revisions(created_at desc);

-- ── 5. updated_at TRIGGER ──────────────────────────────────────
create or replace function public.sop_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists sop_tracks_touch on public.sop_tracks;
create trigger sop_tracks_touch before update on public.sop_tracks
  for each row execute function public.sop_touch_updated_at();

drop trigger if exists sop_phases_touch on public.sop_phases;
create trigger sop_phases_touch before update on public.sop_phases
  for each row execute function public.sop_touch_updated_at();

drop trigger if exists sop_cards_touch on public.sop_cards;
create trigger sop_cards_touch before update on public.sop_cards
  for each row execute function public.sop_touch_updated_at();

-- ── 6. ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.sop_tracks    enable row level security;
alter table public.sop_phases    enable row level security;
alter table public.sop_cards     enable row level security;
alter table public.sop_revisions enable row level security;

-- Alle authentifizierten User: lesen + schreiben (internes Team-Tool)
create policy sop_tracks_select    on public.sop_tracks    for select using (auth.role()='authenticated');
create policy sop_tracks_insert    on public.sop_tracks    for insert with check (auth.role()='authenticated');
create policy sop_tracks_update    on public.sop_tracks    for update using (auth.role()='authenticated');
create policy sop_tracks_delete    on public.sop_tracks    for delete using (auth.role()='authenticated');

create policy sop_phases_select    on public.sop_phases    for select using (auth.role()='authenticated');
create policy sop_phases_insert    on public.sop_phases    for insert with check (auth.role()='authenticated');
create policy sop_phases_update    on public.sop_phases    for update using (auth.role()='authenticated');
create policy sop_phases_delete    on public.sop_phases    for delete using (auth.role()='authenticated');

create policy sop_cards_select     on public.sop_cards     for select using (auth.role()='authenticated');
create policy sop_cards_insert     on public.sop_cards     for insert with check (auth.role()='authenticated');
create policy sop_cards_update     on public.sop_cards     for update using (auth.role()='authenticated');
create policy sop_cards_delete     on public.sop_cards     for delete using (auth.role()='authenticated');

-- Revisionen: lesen + anlegen; kein Löschen (Audit Trail)
create policy sop_revisions_select on public.sop_revisions for select using (auth.role()='authenticated');
create policy sop_revisions_insert on public.sop_revisions for insert with check (auth.role()='authenticated');
