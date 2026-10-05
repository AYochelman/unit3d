-- ═══════════════════════════════════════════════════════════════════════════
--  NOT APPLIED. Step 1 of this file WILL break ordering if applied alone.
--
--  Finding C: anon may insert an order, and the only condition is that `ref`
--  is between 6 and 40 characters. The INSERT grant also covers the columns
--  the shop decides for itself — decision, decision_note, decided_at,
--  progress, shipment, live_email_at, ready_email_at, items_total — so a
--  request can arrive already approved, already marked shipped, with a total
--  of its own choosing.
--
--  This one cannot be closed by policy alone. A static site has no server of
--  its own: the browser talks to PostgREST directly, so "the server decides
--  the price" needs a server. That is step 2, and it is real work.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── step 1 · take the admin columns off the public insert ──────────────────
-- Column-level. The row still arrives from the browser; it simply cannot
-- carry these. The defaults below are what the shop means by "new order".
--
-- Check what is granted today before changing it:
--   select grantee, privilege_type, column_name from information_schema.column_privileges
--    where table_name = 'orders' and grantee in ('anon','authenticated') order by grantee, column_name;

alter table public.orders
  alter column decision        set default null,
  alter column decision_note   set default null,
  alter column decided_at      set default null,
  alter column progress        set default '{}'::jsonb,
  alter column shipment        set default null,
  alter column live_email_at   set default null,
  alter column ready_email_at  set default null;

revoke insert (decision, decision_note, decided_at, progress, shipment,
               live_email_at, ready_email_at, items_total)
  on public.orders from anon;

-- Sanity the rest of it, since nothing did:
alter table public.orders
  add constraint orders_ref_shape check (ref ~ '^[A-Za-z0-9-]{6,40}$'),
  add constraint orders_items_size check (pg_column_size(items) < 256 * 1024);

-- ⚠ items_total is now server-side only. Until step 2 exists there is no
--   server to set it, so it will be null on every new order and the admin
--   view must read the total from `items`. Do not apply this half on its own
--   if that view depends on the column.

-- ── step 2 · the part that needs a server ──────────────────────────────────
-- A Supabase Edge Function `place-order`, the only writer of public.orders:
--
--   · accepts the customer's fields alone — items, contact, note
--   · looks each line up against the catalogue and computes the total there,
--     ignoring whatever the browser sent
--   · keeps "quote only" products working: a null price stays null rather
--     than becoming zero
--   · mints the ref, sets the timestamps, sets status
--   · rate-limits by IP and by contact, and rejects a repeat of the same
--     basket inside a few minutes (idempotency)
--   · then, and only then:  revoke insert on public.orders from anon;
--
-- Until that function is deployed and the site posts to it, the revoke on the
-- last line would stop the shop taking orders. It is written here as the end
-- of the path, not as something to paste in today.
