@echo off
chcp 65001 >nul
title Unit 3D - update the agent
cd /d "%~dp0"
where node >nul 2>nul || (echo. & echo   Node.js is not installed. & echo. & pause & exit /b 1)
node update.mjs
echo.
pause
