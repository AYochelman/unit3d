# מאגר ההזמנות (Supabase)

האתר סטטי ואין לו שרת משלו, אז ההזמנה נשמרת בטבלה אחת ב-Supabase:
הדפדפן של הלקוח כותב שורה, ואריאל — אחרי כניסה — קורא אותה ומחליט.

## 1. יצירת הטבלה

Supabase → הפרויקט → **SQL Editor** → הדבקה והרצה:

```sql
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,
  placed_at     timestamptz not null default now(),
  customer      jsonb not null default '{}'::jsonb,
  inquiry       text default '',
  delivery      text default 'pickup',
  note          text default '',
  lines         jsonb not null default '[]'::jsonb,
  items_total   numeric,
  decision      text not null default 'pending',
  decision_note text default '',
  decided_at    timestamptz
);

alter table public.orders enable row level security;

-- כל אחד יכול להזמין…
create policy "place an order" on public.orders
  for insert to anon
  with check (char_length(ref) between 6 and 40);

-- …אבל רק מי שמחובר רואה את הפרטים ומחליט.
create policy "read orders" on public.orders
  for select to authenticated using (true);

create policy "decide orders" on public.orders
  for update to authenticated using (true) with check (true);
```

## 2. משתמש לכניסה

Authentication → Users → **Add user** → מייל + סיסמה, עם *Auto Confirm User*.
זה המייל והסיסמה שמזינים בלשונית "הזמנות" באדמין.

## 3. חיבור האתר

Project Settings → API → להעתיק **Project URL** ואת המפתח **anon public**,
ולמלא אותם ב-`public/shop.json`:

```json
{ "supabaseUrl": "https://xxxx.supabase.co", "supabaseAnonKey": "eyJ..." }
```

מפתח ה-anon נועד להיות פומבי — מה שמגן על הנתונים הוא ה-RLS למעלה,
לא סודיות המפתח. כל עוד הקובץ ריק, הזמנה מגיעה רק בוואטסאפ ואפשר
לקלוט אותה ידנית בלשונית ההזמנות.
