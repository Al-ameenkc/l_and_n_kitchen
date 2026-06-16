-- L&N Kitchen menu schema
-- Run in Supabase SQL Editor, then create a public storage bucket named "menu-images"

create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category_id uuid not null references categories(id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'NGN',
  short_description text not null,
  description text not null,
  ingredients text[] not null default '{}',
  allergens text[] not null default '{}',
  prep_time_min int not null default 10,
  prep_time_max int not null default 20,
  estimated_calories int not null default 0,
  best_combo_with text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dishes_category_id_idx on dishes(category_id);
create index if not exists categories_sort_order_idx on categories(sort_order);

alter table categories enable row level security;
alter table dishes enable row level security;

create policy "Public read categories"
  on categories for select
  to anon, authenticated
  using (true);

create policy "Public read dishes"
  on dishes for select
  to anon, authenticated
  using (true);

-- Storage bucket for category & dish images (run after tables)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can view images (menu app + admin previews)
create policy "Public read menu images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'menu-images');

-- Authenticated users with service role upload via API (service role bypasses RLS)
-- If uploads fail, also create the bucket manually:
-- Dashboard → Storage → New bucket → name: menu-images → Public bucket: ON
