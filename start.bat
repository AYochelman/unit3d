@echo off
rem Unit 3D - one-click local run (Windows).
rem 1) checks Node, 2) installs packages on first run, 3) starts the dev server,
rem 4) opens the browser only once http://localhost:3000 actually answers.
setlocal
cd /d "%~dp0"
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed on this computer.
  echo Download the LTS installer from https://nodejs.org , install it, then run start.bat again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages ^(first run only, 1-3 minutes^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed. See the errors above.
    pause
    exit /b 1
  )
)

echo Starting the dev server...
start "Unit 3D dev server" cmd /k "npm run dev"

echo Waiting for http://localhost:3000 ...
set /a tries=0
:wait
set /a tries+=1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:3000 -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto ready
if %tries% geq 90 (
  echo The server did not answer after 3 minutes. Check the "Unit 3D dev server" window for errors.
  pause
  exit /b 1
)
timeout /t 2 >nul
goto wait

:ready
start "" http://localhost:3000
echo Open in the browser. Close the "Unit 3D dev server" window to stop.
endlocal
