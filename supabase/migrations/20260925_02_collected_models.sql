-- ═══════════════════════════════════════════════════════════════════════════
--  NOT APPLIED.
--
--  Finding B: collected_models carries INSERT and UPDATE for `anon` with
--  `WITH CHECK (true)`. The publishable key that satisfies that is public by
--  design — it ships in public/shop.json — so the row feeding the import
--  chain is writable by anyone who reads the site's source.
--
--  I built this table and wrote that policy, on 21.9. The reasoning at the
--  time was that the row only reaches the approval queue, where a person
--  decides model by model. That is still true and it is still the wrong
--  default: the queue is the owner's attention, and anyone could fill it.
--
--  ORDER MATTERS. Applying this before the extension can authenticate stops
--  the sweep silently — the badge goes red and the queue simply stops
--  filling. Do step 1 first, and only then step 2.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── step 1 · give the sweep an identity ────────────────────────────────────
-- Create one Supabase user for the extension, by hand, in the dashboard.
-- Not the owner's login, and never the service_role key: a Chrome extension
-- is readable by anyone with the machine, and service_role is every table.
--
--   select id, email from auth.users order by created_at;   -- read only
--
-- Then add it here and have the extension sign in as that user, sending its
-- access token instead of the bare publishable key.
create table if not exists private.collectors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text
);
revoke all on private.collectors from anon, authenticated;
-- insert into private.collectors (user_id, note) values ('<id from above>', 'chrome extension');

create or replace function public.is_collector()
returns boolean
language sql
stable
security definer
set search_path = private, pg_catalog
as $$
  select exists (select 1 from private.collectors c where c.user_id = auth.uid());
$$;
revoke all on function public.is_collector() from public;
grant execute on function public.is_collector() to authenticated;

-- ── step 2 · close the open door ───────────────────────────────────────────
-- Names are from the live database; confirm them first with:
--   select policyname, cmd, roles from pg_policies
--    where schemaname = 'public' and tablename = 'collected_models';
drop policy if exists "extension writes the latest sweep"    on public.collected_models;
drop policy if exists "extension replaces the latest sweep"  on public.collected_models;
drop policy if exists "the sync reads it"                    on public.collected_models;

create policy "collector writes the sweep"   on public.collected_models for insert to authenticated with check (public.is_collector());
create policy "collector replaces the sweep" on public.collected_models for update to authenticated using (public.is_collector()) with check (public.is_collector());
create policy "admin reads the sweep"        on public.collected_models for select to authenticated using (public.is_admin() or public.is_collector());

-- The nightly ingest runs on the owner's machine and reads this table. It
-- must sign in as one of the two above; reading with the publishable key
-- alone stops working the moment this is applied.

-- ── step 3 · a shape the database itself enforces ──────────────────────────
-- Belt to the validator now in scripts/ingest-collected.mjs. The script is
-- the one that protects the import chain; this stops the table from holding
-- something absurd in the first place.
alter table public.collected_models
  add constraint collected_models_doc_is_object
  check (jsonb_typeof(doc) = 'object'),
  add constraint collected_models_doc_size
  check (pg_column_size(doc) < 512 * 1024);
