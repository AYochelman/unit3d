# המדפסת באתר (לייב, טיימלפס, נתונים)

האתר סטטי ורץ בדפדפן של הגולש; המדפסת יושבת ברשת ביתית מאחורי ראוטר.
אין ביניהם קו ישיר. לכן רץ **סוכן** על מחשב שליד המדפסת (`agent/`), מקשיב
למדפסת ברשת המקומית וכותב מה שהוא שומע לאותו פרויקט Supabase של ההזמנות.
האתר רק קורא.

```
מדפסת  ──MQTT/מצלמה/FTPS──▶  סוכן על המחשב  ──HTTPS──▶  Supabase  ──קריאה──▶  unit-3d.com
```

## 1. טבלאות (SQL Editor)

```sql
create table if not exists public.printer_status (
  id            text primary key,
  state         text not null default 'offline',
  model         text,
  job_name      text,
  progress      numeric,
  layer         int,
  layers_total  int,
  minutes_left  int,
  nozzle_temp   numeric,
  nozzle_target numeric,
  bed_temp      numeric,
  bed_target    numeric,
  speed_level   int,
  fan           int,
  filament      text,
  updated_at    timestamptz not null default now()
);

create table if not exists public.printer_jobs (
  key         text primary key,
  name        text not null,
  finished_at timestamptz not null default now(),
  ok          boolean not null default true,
  minutes     int,
  layers      int
);

create table if not exists public.printer_timelapses (
  file        text primary key,
  url         text not null,
  size_mb     numeric,
  recorded_at timestamptz not null default now()
);

alter table public.printer_status      enable row level security;
alter table public.printer_jobs        enable row level security;
alter table public.printer_timelapses  enable row level security;

-- כל אחד רואה את המדפסת; אף אחד לא כותב אליה מהדפדפן.
create policy "read printer status" on public.printer_status
  for select to anon, authenticated using (true);
create policy "read printer jobs" on public.printer_jobs
  for select to anon, authenticated using (true);
create policy "read printer timelapses" on public.printer_timelapses
  for select to anon, authenticated using (true);
```

הסוכן כותב עם ה-**service key**, שעוקף RLS — ולכן אין ואסור שיהיו מדיניות
כתיבה ל-anon. המפתח הזה חי רק על המחשב הביתי, לעולם לא באתר.

## 2. אחסון

Storage → **New bucket** בשם `printer`, מסומן **Public**.
שם נשמרים `live.jpg` (התמונה האחרונה מהמצלמה) ו-`timelapse/*.mp4`.

## 3. הסוכן

ראה `agent/README.md`. בקצרה: מעתיקים `config.example.json` ל-`config.json`,
ממלאים IP, מספר סידורי וקוד גישה של המדפסת + כתובת Supabase ומפתח service,
ומריצים `npm install && npm start`.

## 4. מה האתר מראה

`/livestream` — מצב המדפסת, תמונה מהתא, שם ההדפסה, אחוז, שכבה, זמן שנותר,
טמפרטורות; ומתחת: נתוני סיכום (כמה הדפסות, כמה שעות, אחוז הצלחה),
גלריית טיימלפסים, ורשימת ההדפסות האחרונות. הנורה בפוטר מציגה את המצב האמיתי.
כשאין נתונים, הדף אומר שהמדפסת כבויה — ולא ממציא.
