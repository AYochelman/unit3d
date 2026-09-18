# שהמיילים ללקוחות לא ינחתו בספאם — Brevo + EmailJS

שרתי מייל מסווגים לפי **מי שולח**, לא לפי מה כתוב. מייל "מטעם Unit 3D" שיוצא
מכתובת Gmail, עם קישורים ל-unit-3d.com, נראה להם כמו התחזות קלה — ולכן הוא
נוחת בספאם או ב"קידומי מכירות". התיקון: המייל יוצא מכתובת **בדומיין שלנו**,
והדומיין מאומת ב-DNS (SPF, DKIM, DMARC).

Brevo הוא השולח (חינם עד 300 מיילים ביום, כולל DKIM). EmailJS נשאר הצינור
שהאתר מדבר איתו — הקוד לא משתנה, רק השירות שמאחוריו.

הסדר חשוב: קודם Brevo, אחר כך DNS, ורק אז EmailJS.

---

## 1. Brevo — חשבון ודומיין

1. נרשמים ב-<https://www.brevo.com> (חינם). מאשרים את המייל ומדלגים על
   האשף השיווקי.
2. **Senders, Domains & Dedicated IPs** (בתפריט תחת שם החשבון) → **Domains** →
   **Add a domain** → `unit-3d.com`.
3. Brevo מציג **שלוש רשומות DNS** לאימות. משאירים את החלון פתוח — אלה
   הערכים לשלב 2.
4. באותו מסך, **Senders** → **Add a sender**:
   - From name: `Unit 3D`
   - From email: `orders@unit-3d.com`

   > הכתובת לא צריכה תיבה אמיתית מאחוריה — Brevo שולח ממנה בזכות אימות
   > הדומיין. תשובות של לקוחות מגיעות ל-Reply-To (שלב 3), לא לכאן.

## 2. Cloudflare — רשומות ה-DNS

Cloudflare → הדומיין `unit-3d.com` → **DNS** → **Records** → **Add record**.
כל הרשומות **DNS only** (ענן אפור); TXT ממילא לא עובר פרוקסי, אבל CNAME כן,
ועם פרוקסי האימות נכשל.

| Type | Name | Content | מאיפה הערך |
|------|------|---------|------------|
| TXT | `@` | `brevo-code:XXXXXXXXXXXX` | Brevo, מסך אימות הדומיין — ייחודי לחשבון |
| TXT | `mail._domainkey` | `k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ…` | Brevo, אותו מסך (DKIM). מעתיקים את **כל** המחרוזת |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | Brevo, אותו מסך |
| TXT | `@` | `v=spf1 include:spf.brevo.com ~all` | קבוע |

> **שני הערכים הראשונים הם ייחודיים לחשבון שלך** — להעתיק מהמסך של Brevo, לא
> מכאן. הטבלה אומרת איזו רשומה לאיזה שם; הערך המדויק בא משם.

**אם כבר יש רשומת TXT שמתחילה ב-`v=spf1`** על `@` (למשל של Google) — לא
מוסיפים שנייה. דומיין עם שני SPF נכשל באימות. משלבים לאחת:
`v=spf1 include:_spf.google.com include:spf.brevo.com ~all`.

חוזרים ל-Brevo → **Authenticate this domain**. בדרך כלל ירוק תוך דקות; לפעמים
עד שעה. עד שכל שלוש הרשומות ירוקות — לא ממשיכים לשלב 3.

**DMARC אחרי חודש:** `p=none` רק מדווח. כשהדוחות של Brevo (Domains → DMARC)
מראים שכל המיילים עוברים, מחליפים ל-`p=quarantine` — זה מה שמעלה את הציון
ב-Gmail וב-Outlook.

## 3. EmailJS — להחליף את Gmail ב-Brevo

מפתח SMTP ב-Brevo: **SMTP & API** (תחת שם החשבון) → לשונית **SMTP** →
**Generate a new SMTP key** → לשמור את המפתח (מוצג פעם אחת).

ב-EmailJS → **Email Services** → **Add New Service** → **Other** → **SMTP server**:

| שדה | ערך |
|-----|-----|
| Name | `Brevo` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | **לא** המייל שלך — הערך משורת **Login** במסך SMTP של Brevo, בצורה `<ספרות>@smtp-brevo.com` |
| Password | מפתח ה-SMTP (לא הסיסמה לאתר) |
| From Name | `Unit 3D` |
| From Email | `orders@unit-3d.com` |

לוחצים **Create Service**, ומעתיקים את ה-**Service ID** החדש.

**שתי מלכודות שעצרו את ההתקנה בפועל**, ושתיהן מחזירות שגיאה במסך הבדיקה:

| השגיאה | מה היא אומרת | התיקון |
|--------|--------------|--------|
| `535 Authentication failed` | שם המשתמש או המפתח שגויים | ב-Username הולך ערך ה-**Login** מהמסך של Brevo, לא המייל שאיתו נרשמת. ב-App Password הולך מפתח SMTP באורך 64 שמתחיל ב-`xsmtpsib-`, לא סיסמת החשבון |
| `525 5.7.1 Unauthorized IP address` | הזיהוי עבר, והכתובת נדחתה | Brevo מפעיל IP allowlist בחשבון חדש. ב-**SMTP & API** יש פס סגול למעלה ובתוכו הקישור **Click here** — משם מכבים את ההגבלה או מוסיפים את כתובות EmailJS |

השנייה היא סימן טוב: היא מופיעה רק אחרי ששם המשתמש והמפתח כבר נכונים.

בתבנית (**Email Templates** → התבנית הקיימת → **Settings**):

| שדה | ערך |
|-----|-----|
| From Name | `Unit 3D` |
| From Email | ריק, או `orders@unit-3d.com` |
| **Reply To** | `{{reply_to}}` |

הקוד שולח ב-`reply_to` את כתובת החנות (`lib/contact.ts`), כך שכשלקוח לוחץ
"השב" זה מגיע אליך.

ולבסוף ב-`public/shop.json` — רק ה-`serviceId` משתנה:

```json
"emailjs": { "serviceId": "service_החדש", "templateId": "template_550bis6", "publicKey": "6xriHYgtPJMIx2orb" }
```

דוחפים ל-GitHub; אחרי הדיפלוי כל שלושת המיילים (אישור, עולה למדפסת, מוכנה)
יוצאים דרך Brevo.

> **מפתח SMTP פג אחרי 90 יום בלי שימוש**, בנוסף לתאריך התפוגה שנבחר. החנות
> שולחת רק כשיש הזמנות, ולכן שקט ארוך הורג את המפתח והמיילים מפסיקים לצאת
> בלי שאיש יודע. לחיצה על "בדיקת מייל האישור" ב-/admin פעם בחודשיים מאפסת
> את השעון.

## 4. לבדוק שזה עבד

1. <https://www.mail-tester.com> → מעתיקים את הכתובת שהאתר נותן.
2. ב-/admin → "בדיקת מייל האישור" → מזינים את הכתובת הזאת → שולחים.
3. חוזרים ל-mail-tester → **Then check your score**.

יעד: **9 ומעלה מ-10**. מתחת לזה הדף אומר בדיוק מה חסר, ובדרך כלל זו רשומה
שלא נקלטה עדיין (DKIM) או שני SPF על אותו דומיין.

בדיקה שנייה, אמיתית: לשלוח הזמנת בדיקה לכתובת Gmail שלך ולכתובת Outlook אם
יש, ולראות שהיא בתיבה הראשית.

## מה לא עוזר

לשנות ניסוחים, להוריד אימוג'י או לקצר. המכתבים ב-`lib/order-email.ts` הם
טבלאות בלי תמונות מוטמעות, וזה כבר בסדר. הבעיה הייתה השולח, לא התוכן.
