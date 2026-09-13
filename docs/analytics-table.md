# תנועה באתר — מי נכנס ומאיפה

עד עכשיו לא היה שום מספר: כמה אנשים פתחו את החנות, לאיזה מדף הלכו, האם מישהו
בכלל לחץ על כפתור הוואטסאפ. כל החלטה על האתר הייתה ניחוש.

הקוד כבר מוכן (`lib/analytics.ts`, `components/AnalyticsBoot.tsx`,
`components/admin/TrafficTab.tsx`). מה שנשאר: להריץ פעם אחת את ה-SQL הזה
בפרויקט ה-Supabase של החנות — אותו פרויקט של ההזמנות והביקורות.

Supabase → SQL Editor → New query → להדביק → Run.

```sql
create table if not exists public.site_events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  name          text not null,
  visit         text not null,
  path          text not null,
  source        text not null default 'direct',
  referrer      text,
  utm_campaign  text,
  device        text not null default 'desktop',
  lang          text,
  props         jsonb,

  -- אותו תפקיד שיש למגבלות בטבלת הביקורות: דפדפן שמדלג על הקוד שלנו
  -- עדיין לא יכול לכתוב שורה באורך ספר.
  constraint site_events_name_valid check (name in (
    'page_view','product_open','shelf_open','whatsapp_click','order_start',
    'order_sent','configurator_open','review_sent','live_open','search')),
  constraint site_events_device_valid check (device in ('phone','tablet','desktop')),
  constraint site_events_len check (
    char_length(path) <= 200
    and char_length(visit) <= 40
    and char_length(source) <= 60
    and (referrer is null or char_length(referrer) <= 200)
    and (utm_campaign is null or char_length(utm_campaign) <= 80)
    and (lang is null or char_length(lang) <= 8)
  )
);

create index if not exists site_events_time_idx on public.site_events (created_at desc);
create index if not exists site_events_visit_idx on public.site_events (visit);

alter table public.site_events enable row level security;

-- כל דפדפן כותב אירוע. אף אחד לא קורא בלי להתחבר: הטבלה היא הספרים של
-- החנות, לא תוכן ציבורי.
drop policy if exists site_events_insert_public on public.site_events;
create policy site_events_insert_public on public.site_events
  for insert to anon, authenticated with check (true);

drop policy if exists site_events_read_owner on public.site_events;
create policy site_events_read_owner on public.site_events
  for select to authenticated using (true);

drop policy if exists site_events_delete_owner on public.site_events;
create policy site_events_delete_owner on public.site_events
  for delete to authenticated using (true);
```

## מה נאסף, ומה במפורש לא

| נאסף | לא נאסף |
|---|---|
| איזה עמוד נפתח | שם, מייל, טלפון |
| מאיפה הגיעו (אינסטגרם, גוגל, ישירות…) | כתובת IP |
| `utm_campaign` כשקישור מתויג | עוגיות — אין אף אחת |
| טלפון / טאבלט / מחשב | גודל מסך מדויק |
| שפת הדפדפן | שום דבר ששורד סגירת הטאב |
| איזה מוצר נפתח, מי לחץ וואטסאפ, מי שלח הזמנה | |

מזהה ה-`visit` הוא מחרוזת אקראית ב-sessionStorage. הוא קיים רק כדי שלא ייספרו
שמונה צפיות של אדם אחד כשמונה אנשים, והוא מת עם סגירת הטאב. הוא לא מזהה אף אחד.

**הגלישה שלך לא נספרת.** כל עוד האדמין פתוח בדפדפן שלך המעקב מושתק, אחרת עשרים
הכניסות שלך ביום היו מטביעות את האמיתיות.

## מה שזה לא

זה לא Google Analytics ולא שום צד שלישי. אף שורת קוד חיצונית לא נטענת, ושום
נתון לא יוצא מהפרויקט שלך. זה גם אומר שאין כאן מדינה, עיר או "משתמשים חוזרים"
לאורך שבועות — כל אלה דורשים IP או עוגייה, ובחרנו לא לאסוף אותם.

מה שזה כן: הדפדפן של המבקר כותב שורה, ואתה קורא אותה אחרי התחברות. כמו
הביקורות, גם כאן מי שמחליט לכתוב ישירות ל-API יכול להזריק שורות — המגבלות
בטבלה עוצרות זבל אוטומטי, לא אדם נחוש. אם יום אחד זה יקרה, `delete` מותר
למשתמש מחובר וניתן לנקות.

## אחרי שזה רץ

`/admin` ← טאב **תנועה**. יש שם: מבקרים, צפיות, לחיצות וואטסאפ, הזמנות ואחוז
המרה; גרף מבקרים ליום; ומאיפה הגיעו, אילו עמודים נצפו, אילו מוצרים נפתחו,
אילו קמפיינים הביאו, מכשירים, ורשימת האירועים האחרונים.

**טיפ שמשתלם:** כשאתה מפרסם קישור לאתר בפוסט, הוסף לו
`?utm_source=instagram&utm_campaign=spiderman` (או כל שם). אז תדע בדיוק איזה
פוסט הביא כמה אנשים, ולא רק "אינסטגרם".
