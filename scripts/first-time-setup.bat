@echo off
REM ============================================================================
REM  התקנה ראשונית של הפרויקט על המחשב.
REM
REM  מקליקים פעמיים. הסקריפט בודק שכל מה שצריך מותקן, אומר בדיוק מה חסר אם
REM  משהו חסר, ומתקין את תלויות הפרויקט.
REM
REM  צריך שיהיו מותקנים לפני כן (שניהם חינם, התקנה רגילה של Next-Next-Finish):
REM    Node.js LTS   https://nodejs.org
REM    Git           https://git-scm.com/download/win
REM ============================================================================
setlocal
cd /d "%~dp0.."

echo.
echo   ================================================
echo     Unit 3D - התקנה ראשונית
echo   ================================================
echo.

REM ── מה שצריך להיות מותקן ────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo   [חסר] Node.js לא מותקן, או שהחלון הזה נפתח לפני ההתקנה.
  echo         להוריד מ- https://nodejs.org  ^(הכפתור של LTS^)
  echo         אחרי ההתקנה - לסגור את החלון הזה ולהריץ שוב. חלון שכבר היה
  echo         פתוח לא מכיר תוכנה שהותקנה אחריו.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   [יש] Node.js %%v

where git >nul 2>&1
if errorlevel 1 (
  echo   [חסר] Git לא מותקן, או שהחלון הזה נפתח לפני ההתקנה.
  echo         להוריד מ- https://git-scm.com/download/win
  echo         אחרי ההתקנה - לסגור את החלון הזה ולהריץ שוב. חלון שכבר היה
  echo         פתוח לא מכיר תוכנה שהותקנה אחריו.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('git --version') do echo   [יש] %%v

REM ── האם זו בכלל תיקיית עבודה של git ─────────────────────────────────────────
REM  קובץ ZIP שהורידו מ-GitHub הוא לא עותק עבודה: אין בו .git, ולכן אי אפשר
REM  למשוך עדכונים ואי אפשר לדחוף. הסנכרון היומי עושה את שניהם, אז עדיף
REM  לגלות את זה כאן ולא בשלוש לפנות בוקר ביומן.
if not exist ".git" (
  echo.
  echo   [בעיה] התיקייה הזאת היא לא עותק עבודה של git.
  echo          כנראה זה קובץ ZIP שהורד מ-GitHub. צריך במקומו clone אמיתי:
  echo.
  echo          git clone https://github.com/AYochelman/unit3d.git
  echo.
  echo          ואז להריץ את הקובץ הזה מתוך התיקייה שנוצרה.
  echo.
  pause
  exit /b 1
)
echo   [יש] עותק עבודה של git

echo.
echo   מתקין את תלויות הפרויקט. זה לוקח כמה דקות בפעם הראשונה.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo   [נכשל] npm install לא הצליח. מה שכתוב למעלה הוא הסיבה.
  pause
  exit /b 1
)

echo.
echo   מתקין את הדפדפן שהסנכרון משתמש בו.
echo.
call npx playwright install chromium
if errorlevel 1 (
  echo.
  echo   [אזהרה] התקנת הדפדפן נכשלה. הסנכרון לא יעבוד בלעדיה.
  echo           אפשר לנסות שוב: npx playwright install chromium
)

echo.
echo   ================================================
echo     מוכן. השלב הבא: scripts\mw-login.bat
echo   ================================================
echo.
pause
endlocal
