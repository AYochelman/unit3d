-- ═══════════════════════════════════════════════════════════════════════════
--  NOT APPLIED. Read this before running any of it.
--
--  Finding A: every policy on the private tables reads `TO authenticated
--  USING (true)`. That is not "the owner can see his orders" — it is "anyone
--  holding any valid session can", and the tables it covers are orders,
--  expenses, shop_settings, reviews and the review-photos bucket.
--
--  WHY THIS FILE DOES NOT RUN ITSELF
--
--  Applying it before the admin's user id is filled in below locks the owner
--  out of his own shop. Nothing here should be pasted into the SQL editor
--  until step 0 has a real answer.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── step 0 · who the admin is ──────────────────────────────────────────────
-- Read only. Run this first and put the id it returns into step 1.
--   select id, email, created_at from auth.users order by created_at;

-- ── step 1 · the list, kept where a user cannot reach it ───────────────────
-- Not user_metadata: that is editable by the account it belongs to, so a
-- user who can write his own metadata can make himself an admin. Not a
-- column on a public table either. Its own schema, granted to nobody.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  note text
);
revoke all on private.admins from anon, authenticated;

-- ⚠ Replace the placeholder with the id from step 0 before running.
-- insert into private.admins (user_id, note) values ('00000000-0000-0000-0000-000000000000', 'owner')
--   on conflict (user_id) do nothing;

-- ── step 2 · the test every policy will use ────────────────────────────────
-- security definer so it can read a table the caller cannot, and a pinned
-- search_path so the name `private` cannot be shadowed by the caller.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = private, pg_catalog
as $$
  select exists (select 1 from private.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── step 3 · replace, do not add ───────────────────────────────────────────
-- A permissive policy is an OR. Adding a strict one beside `USING (true)`
-- changes nothing at all: the old one still says yes on its own. Each table
-- drops its broad policies first.
--
-- Fill in the real policy names from:
--   select tablename, policyname, cmd, roles from pg_policies
--    where schemaname = 'public' order by tablename, policyname;

-- orders ────────────────────────────────────────────────────────────────────
-- drop policy "<name>" on public.orders;   -- repeat per broad policy
create policy "admin reads every order"    on public.orders for select to authenticated using (public.is_admin());
create policy "admin updates every order"  on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- Deliberately no "only my own rows": the shop's orders belong to the shop,
-- and a per-user model would hide every customer order from the owner.

-- expenses ──────────────────────────────────────────────────────────────────
create policy "admin reads expenses"   on public.expenses for select to authenticated using (public.is_admin());
create policy "admin writes expenses"  on public.expenses for insert to authenticated with check (public.is_admin());
create policy "admin edits expenses"   on public.expenses for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes expenses" on public.expenses for delete to authenticated using (public.is_admin());

-- shop_settings ─────────────────────────────────────────────────────────────
create policy "admin reads settings"  on public.shop_settings for select to authenticated using (public.is_admin());
create policy "admin writes settings" on public.shop_settings for insert to authenticated with check (public.is_admin());
create policy "admin edits settings"  on public.shop_settings for update to authenticated using (public.is_admin());

-- reviews ───────────────────────────────────────────────────────────────────
-- Public reading of published reviews is the shop working as intended and is
-- left exactly as it is. Only the moderation side narrows.
create policy "admin moderates reviews" on public.reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes reviews"   on public.reviews for delete to authenticated using (public.is_admin());

-- storage · review-photos ───────────────────────────────────────────────────
-- Reading stays public: these photos are published on the site.
create policy "admin deletes review photos" on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and public.is_admin());

-- ── step 4 · prove it before trusting it ───────────────────────────────────
-- In a READ ONLY transaction, as the admin and then as a non-admin:
--   select public.is_admin();
--   select count(*) from public.orders;
-- The admin sees his rows; a signed-in non-admin sees zero and cannot write.
