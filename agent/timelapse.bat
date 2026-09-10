@echo off
chcp 65001 >nul
title Unit 3D - fetch timelapses from the printer
cd /d "%~dp0"
where node >nul 2>nul || (echo. & echo   Node.js is not installed. & echo. & pause & exit /b 1)
if not exist node_modules npm install --no-audit --no-fund
node timelapse.mjs
echo.
pause
