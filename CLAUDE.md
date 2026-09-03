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

`npm run lint` **לא עובד** — הסקריפט מריץ `next lint` שהוסר ב־Next 16, ו־`eslint.config.mjs` מכיל רק בלוק `ignores` בלי חוקים. השתמש ב־`tsc` עד שזה יתוקן.

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
```

13 מסלולים: `/` `/catalog` `/configurator` `/fidgets` `/fidgets/[id]` `/b2b` `/contact` `/gallery` `/livestream` `/reviews` `/tracking` `/upload` `/faq`

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
6. **אין `.git`.** הצעד הראשון הנכון: `git init` וקומיט לפני כל שינוי.

`HANDOFF.md` מכיל את הסיפור המלא ואת רשימת הממצאים הפתוחים.
`בריף-לקלוד-דיזיין.md` הוא מסמך העיצוב המקורי — קהלי יעד, פלטה, וכל דרישה לכל עמוד.

## המשימה הפתוחה הכי משתלמת

לבדוק אם `D:\Claude Projects\Unit 3D` עדיין קיימת. שם נמצאים `public/`, ה־`lib/types.ts` המקורי, והגרסה האחרונה האמיתית של הקוד.
