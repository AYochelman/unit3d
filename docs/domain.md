# חיבור הדומיין unit-3d.com

האתר יושב על GitHub Pages. הדומיין נרכש ומנוהל ב-Cloudflare.
הסדר חשוב: קודם DNS, אחר כך הדומיין ב-GitHub, ורק אז בנייה מחדש.

## 1. Cloudflare → DNS → Records

ארבע רשומות A לשורש, ו-CNAME ל-www. **Proxy status חייב להיות
"DNS only" (ענן אפור)** — עם פרוקסי, GitHub לא מצליח להנפיק את
תעודת ה-HTTPS.

| Type  | Name | Content              | Proxy    |
|-------|------|----------------------|----------|
| A     | @    | 185.199.108.153      | DNS only |
| A     | @    | 185.199.109.153      | DNS only |
| A     | @    | 185.199.110.153      | DNS only |
| A     | @    | 185.199.111.153      | DNS only |
| CNAME | www  | ayochelman.github.io | DNS only |

אם Cloudflare יצר רשומות A או AAAA אחרות לשורש (למשל לדף חנייה) — למחוק.

ב-SSL/TLS → Overview לבחור **Full**. (Flexible יוצר לולאת הפניות.)

## 2. GitHub → Settings → Pages

Custom domain: `unit-3d.com` → Save. לחכות שהבדיקה תעבור (דקות),
ואז לסמן **Enforce HTTPS**.

## 3. בנייה מחדש

עד עכשיו כל הכתובות באתר התחילו ב-`/unit3d/`; בדומיין משלו הן יושבות
בשורש. הוורקפלואו כבר מטפל בזה לבד — `configure-pages` מחזיר
`base_path` ריק ברגע שיש דומיין מותאם — אבל צריך **דיפלוי חדש** כדי
שהקבצים ייבנו מחדש: Actions → Deploy site → Run workflow.

בנוסף `public/CNAME` (המכיל `unit-3d.com`) נכנס ל-artifact ושומר על
ההגדרה בכל דיפלוי.
