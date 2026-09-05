# Unit 3D

אתר עברי (RTL) להזמנת הדפסות תלת־מימד בהתאמה אישית. Next.js App Router.

**ענה בעברית.** קוד, שמות משתנים והערות באנגלית; טקסט מוצר בעברית.

## Stack

Next.js 16.2.6 (Turbopack) · React 19 · TypeScript strict · Tailwind CSS 3 · zustand 5

```bash
npm run dev      # http://localhost:3000
npm run build
npx tsc --noEmit # בדיקת הטיפוסים — זו בדיקת האמת בפרויקט הזה
```

`npm run lint` מריץ `eslint .` עם `next/core-web-vitals` + `next/typescript` (flat config, תוקן 3.9). שלושת הבדיקות — `tsc`, `lint`, `build` — עוברות נקי, ושלושתן צריכות לעבור לפני כל קומיט.

## מבנה

```
app/<route>/page.tsx          Server Component — metadata בעברית בלבד
app/<route>/<Name>Client.tsx  "use client" — כל הלוגיקה והאינטראקציה
components/ui/                Btn · Field · Icon · Logo · Pill · SectionHead
components/home/              סקשנים של דף הבית (Hero, AudienceSwitcher, ...)
components/                   Header · Footer · Emblem · ImageCarousel · KeychainPreview
lib/data.ts                   כל תוכן הדמה — יחידות, ביקורות, גלריה, פילמנטים, FAQ
lib/units-hierarchy.ts        עץ 187 יחידות צה"ל (זרוע → חיל → חטיבה → גדוד)
lib/order-store.ts            zustand — עגלת ההזמנה
lib/types.ts                  כל הטיפוסים המשותפים
lib/products.ts               תגים לחיות + בית/משרד (PRODUCTS), מוצרי המעצב (CONFIG_PRODUCTS), משקלי פידג'טים
lib/materials.ts              משפחות פילמנט (PLA/PLA+/Matte/Silk/PETG/TPU/ABS) + מחיר גליל ברירת מחדל
lib/costing.ts                מודל עלות: חומר + מכונה + חשמל + עבודה + פחת AMS → עלות/רווח/מרווח/מחיר מומלץ
lib/admin-store.ts            zustand — PIN, הגדרות עלות, דריסות לכל מוצר, ייצוא/ייבוא JSON (ADMIN_PIN כאן)
lib/design.ts                 המעצב החופשי: פונטים, צורות (shapePath), פלטה, designToSvg, designSummary
components/designer/          DesignCanvas (עורך בסגנון פאוורפוינט: גרירה, שינוי גודל, סיבוב, שכבות, undo) + DesignGroup (רנדור)
components/ProductPreview.tsx תצוגה חיה לכל מוצרי המעצב (מחזיק מפתחות נשאר על KeychainPreview)
components/ProductArt.tsx     איורי SVG למוצרים בלי תמונה (27 סוגים)
components/ProductGrid.tsx    רשת כרטיסי מוצר → /products/[id]
app/admin/                    אזור ניהול (PIN): טבלת עלויות לכל המוצרים, מחירי גלילים, פרמטרים, בדיקת קובצי סמלים, גיבוי
app/pets/ · app/home-office/  הקטגוריות החדשות · app/products/[id] עמוד מוצר (צבע, חומר, AMS, חריטה, כמות, בלוק עלות למנהל)
```

17 מסלולים: `/` `/catalog` `/configurator` `/fidgets` `/fidgets/[id]` `/pets` `/home-office` `/products/[id]` `/admin` `/b2b` `/contact` `/gallery` `/livestream` `/reviews` `/tracking` `/upload` `/faq`

## המעצב האישי (`/configurator`) — מבנה

שלבים דינמיים לפי המוצר (`CONFIG_PRODUCTS`): מוצר → (דגם) → (צורה) → טקסט/עיצוב → צבע → (גודל) → כמות.
`face: [w, h]` במ"מ הוא הפנים המודפס; קנבס המעצב עובד ב-1 יחידה = 1mm, כך שהעיצוב נשמר בקנה מידה אמיתי.
"עיצוב חופשי" (`mode: "design"`) מחליף את הטקסט המהיר; ההזמנה נושאת `meta.designSvg` (SVG עצמאי) + `meta.designElements`, וטופס יצירת הקשר מציג תמונה ממוזערת.
תוספת מחיר: 15₪ לעיצוב חופשי + 10₪ לכל צבע נוסף (AMS). מחיר כולל חומר לפי הצבע (`materialFromFilamentDesc`); קייסים תמיד TPU.

## פרסום

`.github/workflows/deploy.yml` → GitHub Pages בכל דחיפה ל-main. הוורקפלואו מריץ `tsc` ו-`lint` לפני הבנייה, כך שקוד שבור לא מגיע לאוויר.
`NEXT_PUBLIC_BASE_PATH` מוזרק ע"י הוורקפלואו (Pages מגיש תחת `/<repo>/`); מקומית הוא ריק.

## תמחור: כלל אחד, במקום אחד

`lib/pricing.ts` מחזיק את מדרגת הנחת הכמות (`bulkDiscount` / `lineTotal`). המעצב מצטט דרכה, והסל מחשב אותה מחדש בכל שינוי כמות — לכן שורת סל שומרת מחיר יחידה **לפני** הנחה ב-`meta.baseUnitPrice`, ולא נגזרת מחלוקת הסכום.

תוספת מחיר של חומר היא תמיד ה**דלתא** מעל חומר ברירת המחדל של המוצר (`Math.max(0, mat.priceAdd - default.priceAdd)`), אחרת עמוד המוצר נפתח מעל המחיר שמופיע בקטלוג. הכלל הזה חוזר בשלושה מקומות: עמוד מוצר, עמוד פידג'ט, והמעצב.

## RTL: מלכודות שחזרו בפועל

- **קו מפריד ארוך (–) בין מספרים מתהפך.** "₪50–100" נקרא "100–50" תחת כיוון RTL, כי U+2013 הוא BiDi class ON. להשתמש במקף רגיל, או לעטוף ב-`<bdi dir="ltr">`.
- **`dir="ltr"` על שורה מעורבת הופך את העברית שבה.** לבודד רק את המספר ב-`<bdi>`, לא לעטוף את כל השורה.
- **SVG שמיוצא ונטען דרך `<img>` הוא מסמך מבודד וברירת המחדל שלו LTR.** `designToSvg` מוסיף `direction="rtl"` כדי שמה שהלקוח מזמין יהיה מה שהוא עיצב.

## אזור הניהול (`/admin`)

PIN ב-`lib/admin-store.ts` (ברירת מחדל 1234). המצב נשמר לסשן בלבד (אין localStorage לפי כללי הפרויקט) — לשונית "גיבוי" מייצאת/מייבאת JSON.
כשהמנהל פתוח, עמודי המוצר (פידג'טים, חנות, מעצב) מציגים בלוק עלות ייצור ומרווח. `estimateCost` ב-`lib/costing.ts` הוא מקור האמת היחיד לחישוב.

## מוסכמות

- **RTL** — `dir="rtl"` יושב על `<html>` ב־`app/layout.tsx`. מספרים, יחידות מידה (`mm`, `g`, `h`) ושמות מודלים נשארים LTR.
- **צבע מותג `#089a47`** — ב־Tailwind הוא `brand` **וגם** `flame`. שתי הפלטות זהות לחלוטין; `flame` הוא שריד משם ישן ושתיהן בשימוש. לא לאחד בלי לעבור על כל הקוד.
- **דארק מוד כברירת מחדל.** מוד בהיר עובד דרך `html.light` (ראה `app/globals.css`), לא דרך `dark:`.
- **אסור `localStorage`/`sessionStorage`.** state ב־`useState`/zustand בלבד.
- **פונטים** — Heebo לטקסט, JetBrains Mono למספרים ולנתונים טכניים, דרך `--font-sans` / `--font-mono`.
- **כל מסך מוביל לטופס יצירת הקשר.** הקונפיגורציה נוסעת עם המשתמש דרך `useOrderStore` ומוצגת בראש הטופס. זה לב ההמרה של האתר — לא לשבור אותו.

## מה שחייבים לדעת לפני שנוגעים

**קוד המקור שוחזר ממפות בנייה.** התיקייה נמצאה בלי `app/`, `components/` ו־`lib/`, והם חולצו מ־`sourcesContent` שבתוך `.next`. משמעויות:

1. **`lib/types.ts` הוא שחזור**, לא המקור. נכתב מהשימושים בקוד.
2. **הגרסה שרצה היא מ־22.5, וקיימת גרסה מ־28.5** של `lib/data.ts` ו־`app/fidgets/FidgetsClient.tsx` — שמורה ב־`_recovered-newest/`. היא עוברת לדאטהסט `lib/fidgets.generated.ts` (37 פידג'טים) שתלוי בתמונות מקומיות. **לא לעבור אליה עד ש־`public/` תחזור.**
3. **`lib/fidgets.generated.ts` הוא כרגע קוד מת** — אף אחד לא מייבא אותו. זה יתהפך אם עוברים לגרסת 28.5.
4. **`public/` חסרה לגמרי** — 250 תמונות פידג'טים ו־`hero-loop.mp4`. לא ניתנת לשחזור ממפות קוד. ה־`sourceUrl` של כל פריט רשום ב־`lib/fidgets.generated.ts`.
5. **`.next-old/` היא הארכיון שממנו שוחזר הכל. לא למחוק** עד ש־`public/` תחזור.
6. **יש `.git` מאז 3.9** (קומיט ראשון = מצב ההעברה, קומיט שני = תיקוני lint/config). `_recovered-newest/`, `.next-old/` ו־`*.zip` מוחרגים ב־`.gitignore` וב־`tsconfig.json`.

`HANDOFF.md` מכיל את הסיפור המלא ואת רשימת הממצאים הפתוחים.
`docs/emblems-needed.md` — 100 שמות הקבצים ש-`/catalog` מחפש תחת `public/emblems/` (גם בלשונית "סמלי יחידות" ב-/admin, עם בדיקה חיה).
`בריף-לקלוד-דיזיין.md` הוא מסמך העיצוב המקורי — קהלי יעד, פלטה, וכל דרישה לכל עמוד.

## המשימה הפתוחה הכי משתלמת

לבדוק אם `D:\Claude Projects\Unit 3D` עדיין קיימת. שם נמצאים `public/`, ה־`lib/types.ts` המקורי, והגרסה האחרונה האמיתית של הקוד.
