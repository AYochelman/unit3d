-- ═══════════════════════════════════════════════════════════════════════════
--  Unit 3D · ביקורות + תמונות. הדבקה אחת ב-SQL Editor → Run.
--  אפשר להריץ שוב בלי נזק.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. הטבלה ───────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  tag         text,
  seg         text not null default 'private',
  stars       smallint not null,
  txt         text not null,
  item        text,
  photo       text,
  hidden      boolean not null default false,

  -- המגבלות האלה הן מה שמחליף אישור מראש: דפדפן שמדלג על הטופס
  -- עדיין לא יכול לכתוב ביקורת באורך ספר או דירוג של 900 כוכבים.
  constraint reviews_stars_range check (stars between 1 and 5),
  constraint reviews_name_len    check (char_length(name) between 2 and 40),
  constraint reviews_txt_len     check (char_length(txt)  between 10 and 1200),
  constraint reviews_tag_len     check (tag   is null or char_length(tag)   <= 60),
  constraint reviews_item_len    check (item  is null or char_length(item)  <= 80),
  constraint reviews_photo_len   check (photo is null or char_length(photo) <= 400),
  constraint reviews_seg_valid   check (seg in ('private','soldier','family','b2b'))
);

-- אם הטבלה כבר קיימת מגרסה ישנה יותר, זה משלים את מה שחסר בה.
alter table public.reviews add column if not exists photo text;

create index if not exists reviews_visible_idx
  on public.reviews (created_at desc) where hidden = false;

-- ── 2. מי מורשה למה בטבלה ──────────────────────────────────────────────────
alter table public.reviews enable row level security;

-- כל אחד קורא, אבל רק את מה שלא הורד מהאתר.
drop policy if exists reviews_read_public on public.reviews;
create policy reviews_read_public on public.reviews
  for select to anon, authenticated using (hidden = false);

-- כל אחד כותב ביקורת חדשה, ורק כזו שגלויה. אי אפשר להזריק שורה מוסתרת,
-- ואי אפשר לגעת בשורה של מישהו אחר.
drop policy if exists reviews_insert_public on public.reviews;
create policy reviews_insert_public on public.reviews
  for insert to anon, authenticated with check (hidden = false);

-- אתה, אחרי כניסה: רואה הכל כולל מה שהורדת, מוריד, מחזיר ומוחק.
drop policy if exists reviews_admin_read on public.reviews;
create policy reviews_admin_read on public.reviews
  for select to authenticated using (true);

drop policy if exists reviews_admin_update on public.reviews;
create policy reviews_admin_update on public.reviews
  for update to authenticated using (true) with check (true);

drop policy if exists reviews_admin_delete on public.reviews;
create policy reviews_admin_delete on public.reviews
  for delete to authenticated using (true);

-- ── 3. הדלי שהתמונות יושבות בו ─────────────────────────────────────────────
-- ציבורי לקריאה: כל מבקר צריך לראות את התמונה בכרטיס הביקורת.
-- 6MB היא תקרה נדיבה — הדפדפן מקטין ומקודד מחדש לפני ההעלאה ומגיע ל-200-400KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos', 'review-photos', true, 6291456,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 4. מי מורשה למה בדלי ───────────────────────────────────────────────────
drop policy if exists review_photos_read on storage.objects;
create policy review_photos_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'review-photos');

-- אין כאן update ואין delete ל-anon, כלומר אי אפשר לדרוס תמונה של מישהו אחר
-- ואי אפשר למחוק אותה. השם אקראי, אז גם לא לנחש אותה.
drop policy if exists review_photos_insert on storage.objects;
create policy review_photos_insert on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'review-photos');

drop policy if exists review_photos_admin_delete on storage.objects;
create policy review_photos_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'review-photos');
