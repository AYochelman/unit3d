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

---

# מייל אישור ללקוח (EmailJS)

האתר סטטי, אז אין לנו איפה להחזיק סיסמת SMTP. EmailJS מחזיק את
החשבון; הדף מחזיק רק מפתח פומבי, והמייל עצמו נבנה אצלנו בקוד
(`lib/order-email.ts`) בעיצוב של החנות.

1. נרשמים ב-emailjs.com (חינם, 200 מיילים בחודש).
2. **Email Services** → Add New Service → Gmail (או כל ספק) → מאשרים.
   שומרים את ה-**Service ID**.
3. **Email Templates** → Create New Template:
   - To: `{{to_email}}`
   - Subject: `{{subject}}`
   - Content: לעבור ל-Code / HTML ולהשאיר **שורה אחת בלבד**: `{{{message_html}}}`
     (שלושה סוגריים — כך ה-HTML לא נמלט)
   שומרים את ה-**Template ID**.
4. **Account** → **General** → ה-**Public Key**.
   באותו מסך, Security → להוסיף את `unit-3d.com` ל-allowlist.
5. את שלושת הערכים ל-`public/shop.json`:

```json
"emailjs": { "serviceId": "service_xxx", "templateId": "template_xxx", "publicKey": "xxxx" }
```

כל עוד הם ריקים, לא נשלח מייל ושום דבר אחר לא נשבר.

---

# הזמנות פעילות (סימון פריט כמוכן)

הזמנה שאושרה עוברת ל"בעבודה" ויושבת שם עד שכל פריט בה סומן כמוכן.
הסימון נשמר בשורה עצמה, בעמודה נוספת:

```sql
alter table public.orders
  add column if not exists progress jsonb default '[]'::jsonb;
```

מערך של true/false לפי סדר הפריטים. כשכולם true ההזמנה עוברת ל"מוכנות".

---

# הוצאות (פרטי — רק אחרי כניסה)

הוצאות העסק לא יושבות בקובץ ציבורי אלא בטבלה שנפתחת רק למי שמחובר.

```sql
create table if not exists public.expenses (
  id         text primary key,
  name       text not null,
  amount     numeric not null,
  currency   text not null default 'ILS',
  cycle      text not null default 'monthly',
  date       date,
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_settings (
  key   text primary key,
  value jsonb
);

alter table public.expenses      enable row level security;
alter table public.shop_settings enable row level security;

-- אין ל-anon שום גישה כאן, גם לא קריאה.
create policy "owner reads expenses"   on public.expenses for select to authenticated using (true);
create policy "owner adds expenses"    on public.expenses for insert to authenticated with check (true);
create policy "owner edits expenses"   on public.expenses for update to authenticated using (true) with check (true);
create policy "owner deletes expenses" on public.expenses for delete to authenticated using (true);

create policy "owner reads settings"  on public.shop_settings for select to authenticated using (true);
create policy "owner writes settings" on public.shop_settings for insert to authenticated with check (true);
create policy "owner edits settings"  on public.shop_settings for update to authenticated using (true) with check (true);

-- כל מה שהיה בקובץ עד עכשיו, כדי ששום שורה לא תאבד:
insert into public.expenses (id, name, amount, currency, cycle, date, note) values
  ('x-emailjs',   'EmailJS',             11,    'USD', 'monthly', '2026-09-09', 'מייל אישור הזמנה ללקוחות'),
  ('x-domain',    'דומיין unit-3d.com',  10.44, 'USD', 'yearly',  '2026-09-08', 'Cloudflare Registrar · חידוש שנתי'),
  ('xmtuaai5zcg', 'P2S Printer',         3000,  'ILS', 'once',    '2026-09-09', null),
  ('xmtuadxjdly', 'גליל PLA עשרה',       1000,  'ILS', 'once',    '2026-09-09', null),
  ('xmtuacsksok', 'גליל PLA זוג',        200,   'ILS', 'once',    '2026-09-09', null),
  ('xmtuab5fkr6', 'מוצרי אריזה',         200,   'ILS', 'once',    '2026-09-09', null)
on conflict (id) do nothing;
```

`public/expenses.json` נשאר ריק בכוונה: הוא רק ברירת המחדל של שער הדולר
לפני הכניסה, ואין בו שום נתון עסקי.
