# מעקב הזמנה חי

לקוח מקבל קישור בוואטסאפ ורואה את ההזמנה שלו מדפיסה — בלי חשבון, בלי סיסמה,
ובלי שטבלת ההזמנות תיפתח לאף אחד.

## הרעיון בשורה

המדפסת יודעת רק **שם קובץ**. לכן מספר ההזמנה נכנס לשם הקובץ בזמן הפריסה,
הסוכן מחלץ אותו משם, וכל השאר נגזר מזה.

```
UNIT3D-48213 - Tree Frog.gcode.3mf
└──────┬──────┘
   מספר ההזמנה
```

אם שכחת — אפשר לצרף ידנית מ-`/admin`, והתוצאה זהה.

## מה להריץ ב-Supabase

SQL Editor ← הדבקה והרצה. אפשר להריץ שוב, זה לא הורס כלום.

```sql
-- מה שמחבר הדפסה להזמנה
alter table public.printer_status add column if not exists order_ref text;
alter table public.printer_jobs   add column if not exists order_ref text;

-- אסימון לקישור, וסימון שההודעה כבר נשלחה (כדי שהפעלה מחדש לא תשלח שוב)
alter table public.orders add column if not exists track_token        text;
alter table public.orders add column if not exists notified_started_at timestamptz;
alter table public.orders add column if not exists notified_done_at    timestamptz;

-- החלון היחיד שנפתח החוצה.
--
-- הטבלה עצמה נשארת סגורה: יש בה שם, טלפון, כתובת ומחירים. הפונקציה הזו
-- מחזירה אך ורק שלב, כמה מוכן מתוך כמה, ומה המדפסת עושה עכשיו - ורק אם
-- האסימון מתאים (או שלהזמנה אין אסימון, כמו בהזמנות ישנות).
create or replace function public.order_status(p_ref text, p_token text default null)
returns table (
  stage        text,
  items        int,
  done         int,
  printing     boolean,
  progress     int,
  minutes_left int,
  layer        int,
  layers_total int
)
language plpgsql
security definer
set search_path = public
as $$
declare o record; s record;
begin
  select * into o from public.orders where ref = p_ref;
  if not found then return; end if;
  -- אסימון קיים חייב להתאים. הזמנה בלי אסימון נשארת נגישה לפי המספר בלבד.
  if o.track_token is not null and o.track_token <> coalesce(p_token, '') then return; end if;

  select * into s from public.printer_status where id = 'live';

  stage := case
    when o.decision = 'rejected' then 'rejected'
    when o.decision = 'pending'  then 'pending'
    else 'approved'
  end;
  items := coalesce(jsonb_array_length(o.lines), 0);
  done  := coalesce((
    select count(*)::int from jsonb_array_elements(coalesce(o.progress, '[]'::jsonb)) x
    where x::text = 'true'
  ), 0);
  printing := coalesce(s.order_ref, '') = p_ref and coalesce(s.state, '') = 'printing';
  if printing then
    progress := s.progress; minutes_left := s.minutes_left;
    layer := s.layer; layers_total := s.layers_total;
  end if;
  return next;
end $$;

revoke all on function public.order_status(text, text) from public;
grant execute on function public.order_status(text, text) to anon, authenticated;
```

> אם `orders` עדיין בלי עמודת `progress`, להוסיף גם:
> `alter table public.orders add column if not exists progress jsonb default '[]'::jsonb;`

## ההתראות בוואטסאפ

הסוכן שולח, כי הוא היחיד שיודע מתי הדפסה מתחילה ומתי היא נגמרת. מוסיפים
ל-`agent/config.json`:

```json
"whatsapp": {
  "url": "https://api.green-api.com",
  "instance": "1101000001",
  "token": "הטוקן מ-Green API",
  "siteUrl": "https://unit-3d.com"
}
```

בלי החלק הזה הסוכן ממשיך לעבוד רגיל ורק **מדפיס** מה הוא היה שולח — כך אפשר
לראות שהטקסט והקישור נכונים לפני שמחברים ספק ומתחילים לשלם.

שתי הודעות בלבד, ואף פעם לא פעמיים על אותה הזמנה:

| מתי | מה נשלח |
|-----|---------|
| ההדפסה התחילה | "ההזמנה שלך נכנסה להדפסה" + קישור לצפייה חיה |
| ההדפסה נגמרה | "ההדפסה הסתיימה, נעדכן כשתהיה מוכנה" |
