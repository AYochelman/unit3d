@echo off
chcp 65001 >nul
title Unit 3D - printer agent settings
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed. Get it from https://nodejs.org and try again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Changing the agent's settings. Press Enter to keep any value shown in [brackets].
echo.
node setup.mjs
echo.
echo   Done. Close the agent window if it is open, then run start.bat again.
pause
