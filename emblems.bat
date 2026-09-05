@echo off
rem Unit 3D - download the IDF unit emblems (double-click me).
setlocal
cd /d "%~dp0"
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. Get the LTS installer from https://nodejs.org , then run this again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages first...
  call npm install
)

node scripts\fetch-emblems.mjs %*
echo.
pause
