# מסלול הפעלה — קשיחות אבטחה

הענף: `security/unit3d-hardening`. לא נדחף.
המסד **לא נגעתי בו**. כל מה שכאן דורש שתריץ אותו בעצמך.

הכלל שמנחה את הסדר: **בכל שלב, אם משהו נשבר — עוצרים ומריצים את ה-rollback של
אותו שלב בלבד.** אין שלב שתלוי בשלב שאחריו.

---

## שלב 0 — לפני הכל, קריאה בלבד

ב-Supabase → SQL Editor. שלוש שאילתות, אף אחת לא משנה כלום:

```sql
-- 0.1 מי המשתמשים בפרויקט
select id, email, created_at from auth.users order by created_at;

-- 0.2 מה ה-policies אומרות היום
select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies where schemaname = 'public'
  order by tablename, policyname;

-- 0.3 מי מורשה להכניס הזמנה, ולאילו עמודות
select grantee, privilege_type, column_name
  from information_schema.column_privileges
  where table_name = 'orders' and grantee in ('anon','authenticated')
  order by grantee, column_name;
```

**מה לשלוח לי:** את הפלט של 0.2 ו-0.3 במלואו, ומ-0.1 **רק את ה-id שלך** (בלי
המייל אם לא בא לך). בלי ה-id, migration 01 נועל אותך מחוץ לחנות.

> אני לא יכול להריץ את זה בעצמי — הפרוקסי של הסביבה חוסם את Supabase.
> כל מה שכתבתי על המצב הפעיל מסתמך על הסריקה שלך מ-23.9.

---

## שלב 1 — הרשאות מנהל (`01_admin_role.sql`)

**הסיכון אם תריץ לא נכון:** אתה נעול מחוץ ל-`/admin`.

1. `create schema private` + `private.admins` + `public.is_admin()` — בטוח, לא משנה גישה
2. `insert into private.admins ... values ('<ה-id שלך>')` — **חובה לפני 3**
3. `select public.is_admin();` → חייב להחזיר `true`. **אם `false` — עצור כאן**
4. רק אז: `drop policy` לכל policy רחבה, ואז ה-policies החדשות

**בדיקה אחרי:** פתח `/admin` ← הזמנות. אתה רואה את כולן.
פתח בחלון פרטי בלי התחברות ← `/` ← הקטלוג, המעצב והזמנה עובדים כרגיל.

**Rollback:**
```sql
drop policy "admin reads every order" on public.orders;   -- וכן הלאה
-- ואז להחזיר את ה-policies הישנות מתוך הפלט של 0.2
```
**לכן הפלט של 0.2 חייב להישמר אצלך לפני שמתחילים.**

---

## שלב 2 — טבלת הסריקה (`02_collected_models.sql`)

**הסיכון:** הסריקה של התוסף נפסקת בשקט, הבאדג' אדום, התור מפסיק להתמלא.

1. ליצור בדאשבורד משתמש Supabase **נפרד** לתוסף. לא ההתחברות שלך, ולא service_role
2. להכניס את ה-id שלו ל-`private.collectors`
3. **לפני** שמחליפים policies: לשנות את התוסף ואת `ingest-collected` להתחבר כמשתמש הזה
4. ורק אז `drop policy` + החדשות

**שלב 3 הוא עבודה שלי בקוד.** תגיד לי כשיש לך משתמש לתוסף ואני כותב את
ההתחברות בשני הצדדים. עד אז **אל תריץ את שלב 4** — הוא ישבור את האיסוף.

**בדיקה אחרי:** לחיצה על אייקון התוסף → באדג' ירוק עם מספר → `npm run ingest:collected` מביא מודלים.

---

## שלב 3 — הזמנות (`03_orders_insert.sql`)

**הסיכון:** החנות מפסיקה לקבל הזמנות.

רק **step 1** של הקובץ מוכן להרצה, ורק אחרי שתוודא דבר אחד:

```sql
-- האם משהו בממשק קורא items_total?
select ref, items_total from public.orders order by created_at desc limit 5;
```

אם `items_total` מלא בהזמנות קיימות ו-`/admin` מציג ממנו סכום — **אל תריץ**,
כי מהרגע הזה הוא יהיה `null` בכל הזמנה חדשה. תגיד לי ואני משנה את התצוגה
לחשב מ-`items` לפני שנוגעים במסד.

**step 2 לא קיים עדיין.** הוא Edge Function שצריך להיכתב. עד שהוא רץ,
`revoke insert ... from anon` **יסגור את החנות**.

---

## מה שלא ייגע בייצור בכלל

התיקונים שכבר עשיתי בקוד — יציאה מ-Supabase, אימות מסמך הסריקה, הסרת כפתור
ההזמנות הידניות — לא נוגעים במסד ולא משנים כלום בחוויית הקנייה. הם ממתינים
בענף.

---

## ההחלטה על push

הבריף שלך אוסר push. ההוראה שלך מאתמול אומרת לדחוף אוטומטית.
נהגתי לפי הבריף. שתי אפשרויות:

- **א.** אני דוחף את שלושת התיקונים ל-main עכשיו (הם לא נוגעים במסד, והאתר
  ממשיך לעבוד בדיוק כמו היום), וה-migrations נשארים כקבצים שלא רצים
- **ב.** הכל ממתין בענף עד שתעבור על הקוד

תגיד א או ב.
