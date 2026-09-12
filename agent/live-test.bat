@echo off
chcp 65001 >nul
title Unit 3D - test broadcast
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed.
  pause
  exit /b 1
)

node -e "require('fs').writeFileSync('.live-test', String(Date.now()))"

echo.
echo   Asked the agent for a 90-second test broadcast.
echo   The agent window must be open for this to work.
echo.
echo   Now open:  https://unit-3d.com/livestream
echo   Video should appear within about 15 seconds.
echo.
echo   Nothing is printing, so you will be looking at an empty plate -
echo   the point is whether it MOVES.
echo.
pause
