# תמונה בביקורת

לקוח יכול לצרף תמונה לביקורת, והיא מופיעה באתר יחד איתה — באותו רגע, בלי אישור,
כמו הביקורת עצמה. הקוד באתר מוכן (`lib/review-photo.ts`, `components/ReviewForm.tsx`,
`components/admin/ReviewsTab.tsx`). מה שנשאר: הרצה חד-פעמית ב-Supabase — **עמודה
בטבלה** ו**דלי אחסון**. שניהם ב-SQL Editor, הדבקה אחת.

> אם עוד לא הרצת את `docs/reviews-table.md`, תריץ אותו קודם — זה יוצר את הטבלה.

Supabase → SQL Editor → New query → להדביק → Run.

```sql
-- ── 1. איפה ה-URL של התמונה נשמר ─────────────────────────────────────────────
alter table public.reviews add column if not exists photo text;

alter table public.reviews drop constraint if exists reviews_photo_len;
alter table public.reviews add  constraint reviews_photo_len
  check (photo is null or char_length(photo) <= 400);

-- ── 2. הדלי שהתמונות יושבות בו ───────────────────────────────────────────────
-- ציבורי לקריאה: כל מבקר באתר צריך לראות את התמונה בכרטיס הביקורת.
-- 6MB הוא תקרה נדיבה — הדפדפן מקטין ומקודד מחדש לפני ההעלאה ומגיע ל-200-400KB,
-- והתקרה כאן היא רק בשביל התמונה שהקטנה שלה נכשלה (HEIC בדפדפן ישן).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos', 'review-photos', true, 6291456,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 3. מי מורשה למה ──────────────────────────────────────────────────────────
-- כל אחד קורא. הדלי ציבורי ממילא, וזאת המדיניות שמאפשרת את זה.
drop policy if exists review_photos_read on storage.objects;
create policy review_photos_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'review-photos');

-- כל אחד מעלה — רק לדלי הזה. אין כאן update ואין delete ל-anon, כלומר אי אפשר
-- לדרוס תמונה של מישהו אחר ואי אפשר למחוק אותה; השם אקראי, אז גם לא לנחש אותה.
drop policy if exists review_photos_insert on storage.objects;
create policy review_photos_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'review-photos');

-- אתה, אחרי כניסה: מוחק תמונה שלא במקומה.
drop policy if exists review_photos_admin_delete on storage.objects;
create policy review_photos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-photos');
```

## מה קורה לתמונה בדרך

| שלב | מה קורה |
|---|---|
| הלקוח בוחר תמונה | עד 25MB. הצד הארוך מוקטן ל-1400px והקובץ מקודד מחדש ל-JPEG — בדרך כלל 200-400KB. |
| ה-EXIF | נעלם בקידוד מחדש, ואיתו קואורדינטות ה-GPS של הסלון של הלקוח. זה רצוי. |
| השם | נזרק. מה שנשמר הוא מזהה אקראי, לא `IMG_4821.HEIC`. |
| ההעלאה נכשלה | הביקורת מתפרסמת בכל זאת, בלי התמונה, והטופס אומר את זה ומציע לשלוח בוואטסאפ. |
| הדפדפן לא יודע לפענח (HEIC ישן) | הקובץ המקורי עולה כמו שהוא, אם הוא מתחת ל-5MB. |

## מה זה לא עוצר

אותה עסקה של הביקורות עצמן: עם מפתח ה-anon, שהוא ציבורי מעצם הגדרתו, אפשר להעלות
לדלי בלי לעבור דרך הטופס. אין `update` ואין `delete` ל-anon, אז אי אפשר לגעת בתמונה
קיימת — אבל אפשר להוסיף. אם יום אחד מישהו ימלא את הדלי בזבל, טאב **ביקורות** ב-`/admin`
מוחק את הביקורת, ו-Supabase → Storage → review-photos מוחק את הקובץ.
