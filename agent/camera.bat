@echo off
chcp 65001 >nul
title Unit 3D - why is the camera black
cd /d "%~dp0"
where node >nul 2>nul || (echo. & echo   Node.js is not installed. Get it from https://nodejs.org & echo. & pause & exit /b 1)
if not exist node_modules npm install --no-audit --no-fund
node camera.mjs
echo.
pause
