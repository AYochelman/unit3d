# ביקורות שמתפרסמות לבד

הביקורת של לקוח נכתבת ישירות לטבלה ומופיעה באתר מיד — בלי אישור ובלי שלב ביניים.
הקוד באתר כבר מוכן (`lib/reviews-remote.ts`, `components/ReviewForm.tsx`,
`components/admin/ReviewsTab.tsx`). מה שנשאר: להריץ פעם אחת את ה-SQL הזה בפרויקט
ה-Supabase של החנות — אותו פרויקט שההזמנות יושבות בו.

Supabase → SQL Editor → New query → להדביק → Run.

```sql
-- ── הטבלה ────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  tag         text,
  seg         text not null default 'private',
  stars       smallint not null,
  txt         text not null,
  item        text,
  hidden      boolean not null default false,

  -- המגבלות האלה הן מה שמחליף אישור מראש: דפדפן שמדלג על הטופס
  -- עדיין לא יכול לכתוב ביקורת באורך ספר או דירוג של 900 כוכבים.
  constraint reviews_stars_range check (stars between 1 and 5),
  constraint reviews_name_len    check (char_length(name) between 2 and 40),
  constraint reviews_txt_len     check (char_length(txt)  between 10 and 1200),
  constraint reviews_tag_len     check (tag  is null or char_length(tag)  <= 60),
  constraint reviews_item_len    check (item is null or char_length(item) <= 80),
  constraint reviews_seg_valid   check (seg in ('private','soldier','family','b2b'))
);

create index if not exists reviews_visible_idx
  on public.reviews (created_at desc) where hidden = false;

-- ── מי מורשה למה ─────────────────────────────────────────────────────────────
alter table public.reviews enable row level security;

-- כל אחד קורא — אבל רק את מה שלא הורד מהאתר.
drop policy if exists reviews_read_public on public.reviews;
create policy reviews_read_public on public.reviews
  for select to anon, authenticated
  using (hidden = false);

-- כל אחד כותב ביקורת חדשה, ורק כזו שגלויה.
-- אי אפשר להזריק שורה מוסתרת, ואי אפשר לגעת בשורה של מישהו אחר.
drop policy if exists reviews_insert_public on public.reviews;
create policy reviews_insert_public on public.reviews
  for insert to anon, authenticated
  with check (hidden = false);

-- אתה, אחרי כניסה: רואה הכל (כולל מה שהורדת), מוריד, מחזיר ומוחק.
drop policy if exists reviews_admin_read on public.reviews;
create policy reviews_admin_read on public.reviews
  for select to authenticated using (true);

drop policy if exists reviews_admin_update on public.reviews;
create policy reviews_admin_update on public.reviews
  for update to authenticated using (true) with check (true);

drop policy if exists reviews_admin_delete on public.reviews;
create policy reviews_admin_delete on public.reviews
  for delete to authenticated using (true);
```

## איך זה מתנהג אחרי זה

| המצב | מה קורה |
|---|---|
| לקוח לוחץ "פרסם ביקורת" | שורה נכתבת, והביקורת באתר. הטופס אומר "פורסמה באתר". |
| ה-SQL עוד לא רץ / אין רשת | הטופס **לא** בולע את הטקסט — הוא פותח וואטסאפ עם הביקורת כתובה, ואומר שזה מה שקרה. |
| ביקורת שלא במקומה | `/admin` → טאב **ביקורות** → "הורד מהאתר". השורה נשארת, אפשר להחזיר. "מחק" הוא סופי. |

## מה זה כן עוצר ומה לא

בטופס יש שדה מלכודת שאף אדם לא רואה, ומינימום ארבע שניות בין פתיחת הטופס לשליחה.
זה מספיק לבוטים שעוברים על טפסים באופן אוטומטי. **זה לא עוצר מישהו שמחליט לכתוב
ישירות ל-API** — עם מפתח ה-anon, שהוא ציבורי מעצם הגדרתו, אפשר לשלוח בקשה בלי
הדפדפן שלנו. זאת העסקה של פרסום בלי אישור: ההגנה היא הורדה בדיעבד, לא סינון מראש.

אם יום אחד זה יהפוך לבעיה, שתי האפשרויות הן: להחזיר `hidden = true` כברירת מחדל
(ואז חזרנו לאישור), או Edge Function עם rate-limit לפי IP — שזה כבר שרת.
