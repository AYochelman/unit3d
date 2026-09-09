@echo off
chcp 65001 >nul
title Unit 3D - live video check
cd /d "%~dp0"
where node >nul 2>nul || (echo. & echo   Node.js is not installed. & echo. & pause & exit /b 1)
if not exist node_modules npm install --no-audit --no-fund
node live-check.mjs
echo.
pause
