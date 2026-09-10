@echo off
chcp 65001 >nul
title Unit 3D - timelapses, full transcript
cd /d "%~dp0"
where node >nul 2>nul || (echo. & echo   Node.js is not installed. & echo. & pause & exit /b 1)
echo.
echo   This prints every message sent to the printer and every answer it gives.
echo   It is long. Scroll up, or right-click the title bar ^> Edit ^> Select All,
echo   then Ctrl+C, and paste it into the chat.
echo.
node timelapse.mjs --debug
echo.
pause
