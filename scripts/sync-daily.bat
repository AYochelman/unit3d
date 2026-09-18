@echo off
REM ============================================================================
REM  Unit 3D - reads the MakerWorld collections and queues what is new.
REM
REM  Runs on ARIEL'S OWN MACHINE, once a day, from Task Scheduler.
REM
REM  Why here and not on GitHub: Cloudflare serves the collection PAGES a
REM  challenge to every datacenter address - GitHub's runners and hosted browser
REM  services alike, both tested - while a home connection is never challenged.
REM  The nightly job on GitHub reported "signedIn: true" and then "Cloudflare"
REM  for all eight collections, every night. This is the same script, run from
REM  an address the site trusts.
REM
REM  Nothing is approved here. What is new lands in /admin -> models awaiting
REM  approval, and a person still decides model by model.
REM ============================================================================
setlocal
cd /d "%~dp0.."

REM The signed-in browser profile. Created once by: npm run sync:collections -- --login
set MAKERWORLD_PROFILE_DIR=%~dp0..\data\mw-profile

REM  אין כאן דפדפן. עמודי האוספים מקבלים את האתגר של Cloudflare עם תיבה
REM  לסימון, ודפדפן מנוהל לא יכול לסמן אותה - זה בדיוק מה שהתיבה בודקת.
REM  נוסו: נסתר, גלוי, Chromium, כרום אמיתי, ופרופיל מחובר. כולם נעצרו שם.
REM
REM  לכן רשימת המספרים מגיעה מהדפדפן שלך: פותחים makerworld.com מחובר,
REM  F12 ואז Console, מדביקים את scripts\collect-collections-in-browser.js,
REM  והתוצאה נכנסת ל-data\pending-models.json. כל השאר - רישיון, מדף,
REM  מספרים ותמונות - ממשיך דרך ה-API, שעונה תמיד.
set LOG=%~dp0sync-daily.log

REM ── איפה git ────────────────────────────────────────────────────────────────
REM  מתקין Git שבו נבחרה האפשרות "Use Git from Git Bash only" לא מוסיף את git
REM  ל-PATH של Windows, ואז cmd עונה "'git' is not recognized" למרות שהוא
REM  מותקן. במקום להיכשל, מחפשים אותו במקומות שהמתקין משתמש בהם.
REM
REM  בלי סוגריים ובלי שרשור if: הנתיב של ProgramFiles(x86) מכיל ")" בעצמו,
REM  ובתוך בלוק סוגריים הוא סוגר את הבלוק מוקדם. זאת מלכודת ותיקה של batch.
set "GIT=git"
where git >nul 2>&1
if not errorlevel 1 goto :git_ok
if exist "%ProgramFiles%\Git\cmd\git.exe" set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if not "%GIT%"=="git" goto :git_ok
set "PF86=%ProgramFiles(x86)%"
if exist "%PF86%\Git\cmd\git.exe" set "GIT=%PF86%\Git\cmd\git.exe"
if not "%GIT%"=="git" goto :git_ok
if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
:git_ok

echo [%date% %time%] sync starting >> "%LOG%"

call "%GIT%" pull --rebase origin main  >> "%LOG%" 2>&1
REM  No --publish. Every new model waits for him in /admin, including ones he
REM  saved to his own collection - he said so in as many words on 18.9, and it
REM  overrides the exception that used to live here. What comes in from a
REM  collection still arrives with its shelf already worked out; what it does
REM  not arrive with is a decision.
call npm run sync:collections -- --offline  >> "%LOG%" 2>&1

REM Turn those answers - his own, and the ones just written above - into rows
REM on the shelf. Reads public/model-decisions.json, which /admin also writes.
call npm run apply:approvals        >> "%LOG%" 2>&1

REM A like is not a decision either: it goes to the same approval queue.
if exist data\liked-models.json (
  for /f "delims=" %%I in ('node -e "const j=require('./data/liked-models.json');process.stdout.write((j.fresh||[]).join(' '))"') do (
    if not "%%I"=="" call npm run add:candidates -- %%I >> "%LOG%" 2>&1
  )
)

REM The designer's whole gallery for models that only ever got a cover. Touches
REM only models with no gallery yet, so it shrinks to nothing after a few days
REM and then costs one pass over the catalogue. Runs HERE and not on GitHub:
REM makerworld.com answers a home connection and turns datacenters away.
call npm run backfill:images  >> "%LOG%" 2>&1

call npm run fetch:images  >> "%LOG%" 2>&1

REM A row that does not compile must not reach the site.
call npx tsc --noEmit  >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [%date% %time%] TYPE CHECK FAILED - nothing pushed >> "%LOG%"
  exit /b 1
)

"%GIT%" add lib/imported.generated.ts lib/candidates.generated.ts lib/localImages.generated.ts ^
        public/model-decisions.json data/rejected-models.json ^
        data/makerworld-raw.json data/pending-models.json data/liked-models.json ^
        data/collections-status.json public/img/catalog  >> "%LOG%" 2>&1

"%GIT%" diff --cached --quiet
if errorlevel 1 (
  "%GIT%" commit -m "MakerWorld: queue what was found for approval"  >> "%LOG%" 2>&1
  "%GIT%" push origin main                                      >> "%LOG%" 2>&1
  echo [%date% %time%] pushed >> "%LOG%"
) else (
  echo [%date% %time%] nothing new >> "%LOG%"
)

endlocal
