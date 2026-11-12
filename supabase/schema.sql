-- Vinyl Collector: database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement checks whether the object already exists.

-- ---------------------------------------------------------------------------
-- Profile (exactly one row, shared by everyone who logs in)
-- ---------------------------------------------------------------------------
create table if not exists public.profile (
  id            int primary key default 1 check (id = 1),
  name          text not null default 'Unsere Sammlung',
  handle        text not null default '@vinyl',
  avatar_url    text,
  banner_url    text,
  fav_artist    text,
  fav_song      text,
  fav_album_id  uuid,
  -- ordered list of collection_items.id shown as spines on the home shelf
  shelf         uuid[] not null default '{}',
  updated_at    timestamptz not null default now()
);

insert into public.profile (id) values (1) on conflict (id) do nothing;

-- Added later (2026-11): home page settings
alter table public.profile add column if not exists home_bg     text;                          -- hex, null = default cream
alter table public.profile add column if not exists fav_display text not null default 'vinyl'; -- vinyl | cover
alter table public.profile alter column fav_display set default 'vinyl';
alter table public.profile add column if not exists fav_disc       int;  -- which record of the favourite album is shown (0 = first)
alter table public.profile add column if not exists fav_icon_color text; -- colour of the favourite icons, null = default red
alter table public.profile add column if not exists shelf_record_id uuid; -- record shown big in the home shelf (any size); null = favourite album

-- ---------------------------------------------------------------------------
-- Collection
-- ---------------------------------------------------------------------------
create table if not exists public.collection_items (
  id                   uuid primary key default gen_random_uuid(),
  discogs_release_id   bigint not null,
  discogs_instance_id  bigint,              -- id of the copy in the Discogs account collection
  title                text not null,
  artist               text not null,
  year                 int,
  format               text,
  country              text,
  label                text,
  cover_url            text,
  thumb_url            text,
  images               jsonb not null default '[]',
  -- user-entered details
  vinyl_color          text not null default '#1a1a1a',   -- hex colour
  vinyl_color_name     text not null default 'Schwarz',
  vinyl_pattern        text not null default 'solid',     -- solid | marbled | splatter | picture | split
  photo_url            text,
  comment              text,
  signed               boolean not null default false,
  -- derived
  spine_color          text,               -- dominant cover colour, used on the home shelf
  value_eur            numeric(10,2),      -- Discogs price suggestion (VG+)
  lowest_price_eur     numeric(10,2),
  num_for_sale         int,
  prices_updated_at    timestamptz,
  added_at             timestamptz not null default now()
);

create index if not exists collection_items_added_at_idx on public.collection_items (added_at desc);

-- Added later (2026-11): more details per copy
alter table public.collection_items add column if not exists size       text;   -- 12" | 10" | 7" | 4"
alter table public.collection_items add column if not exists disc_count int;    -- 1–4
alter table public.collection_items add column if not exists discs      jsonb;  -- [{ colors: [hex…], name, pattern }] per record
alter table public.collection_items add column if not exists shape      text;   -- null = round | heart | star | …
alter table public.collection_items add column if not exists condition  text;   -- M | NM | VG+ | VG | G+ | G | F | P
alter table public.collection_items add column if not exists value_condition text; -- condition value_eur was taken for (condition, or VG+ as fallback)
alter table public.collection_items add column if not exists signed_items text[]; -- what is signed: Art-Card | Vinyl Sized | Poster | Cover

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profile_fav_album_fk') then
    alter table public.profile add constraint profile_fav_album_fk
      foreign key (fav_album_id) references public.collection_items (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profile_shelf_record_fk') then
    alter table public.profile add constraint profile_shelf_record_fk
      foreign key (shelf_record_id) references public.collection_items (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security: only logged-in users can read or write anything.
-- (There is one shared login, so no per-user separation is needed.)
-- ---------------------------------------------------------------------------
alter table public.profile enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "profile_rw" on public.profile;
create policy "profile_rw" on public.profile
  for all to authenticated using (true) with check (true);

drop policy if exists "items_rw" on public.collection_items;
create policy "items_rw" on public.collection_items
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for own photos (record photos, avatar, banner).
-- Public read so <img> tags work; only logged-in users can upload/delete.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');

drop policy if exists "photos_update" on storage.objects;
create policy "photos_update" on storage.objects
  for update to authenticated using (bucket_id = 'photos');

drop policy if exists "photos_delete" on storage.objects;
create policy "photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');

-- ---------------------------------------------------------------------------
-- Added 2026-11: records ordered but not arrived yet (home, under the wantlist)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  discogs_release_id bigint not null,
  title              text not null,
  artist             text,
  cover_url          text,
  thumb_url          text,
  date               date,                              -- optional
  date_kind          text not null default 'delivery',  -- delivery | release
  created_at         timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "orders_rw" on public.orders;
create policy "orders_rw" on public.orders
  for all to authenticated using (true) with check (true);
-- placeholders: ordered records that are not on Discogs yet have no release id
alter table public.orders alter column discogs_release_id drop not null;
alter table public.collection_items add column if not exists signature_url text; -- photo of the signature (only shown when signed)
