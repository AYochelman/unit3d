# סוכן המדפסת

מחבר את המדפסת לאתר. רץ על מחשב שנמצא באותה רשת כמו המדפסת ונשאר דלוק.

## מה צריך פעם אחת

1. **Node.js** מותקן על המחשב (nodejs.org, גרסה 20 ומעלה).
2. **מצב LAN במדפסת**: במסך המדפסת → Settings → Network →
   להפעיל **LAN Mode / LAN Only** ולרשום את ה-**Access Code** ואת ה-**IP**.
   את המספר הסידורי (Serial) רואים באותו מסך או במדבקה מאחור.
3. **Supabase**: הטבלאות מ-`docs/printer-live.md` והבאקט `printer` (ציבורי).

## הרצה

```bash
cd agent
cp config.example.json config.json      # ולמלא את הפרטים
npm install
npm start
```

בהרצה תקינה יופיע "מחובר למדפסת" ואז שורות עדכון. באתר, בעמוד
`/livestream`, המצב יתחלף תוך עשר שניות.

## מה הוא שולח

| כל | מה |
|----|-----|
| 5 שניות | מצב, שם ההדפסה, אחוז, שכבה, זמן שנותר, טמפרטורות, פילמנט |
| 15 שניות | תמונה מהמצלמה (`live.jpg`) |
| 30 דקות | טיימלפסים חדשים מהכרטיס של המדפסת |
| בסוף הדפסה | שורה ביומן: שם, כמה זמן לקח, הצליחה או נעצרה |

## שיישאר דלוק אחרי אתחול (Windows)

```powershell
# מריצים פעם אחת בטרמינל רגיל, מחליפים את הנתיב:
$action  = New-ScheduledTaskAction -Execute "node" -Argument "printer-agent.mjs" -WorkingDirectory "C:\unit3d\agent"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Unit3D Printer Agent" -Action $action -Trigger $trigger
```

## אבטחה

`config.json` מכיל את קוד הגישה למדפסת ואת מפתח ה-service של Supabase.
הוא **לא נכנס ל-git** (ראה `.gitignore`) ולא עולה לאתר. המפתח הזה יכול לכתוב
הכול — הוא חי רק על המחשב הזה.

## אם לא מתחבר

- "MQTT ✗" חוזר: בדוק IP, קוד גישה, ושהמדפסת ב-LAN Mode.
- אין תמונה: בדגמי P יש להפעיל **LAN Mode Liveview** בהגדרות המדפסת.
- אין טיימלפסים: הם נשמרים רק אם ההגדרה **Timelapse** דלוקה בסלייסר.
