@echo off
chcp 65001 >nul
title Unit 3D - checking the setup
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed - get it from https://nodejs.org & pause & exit /b 1)
if not exist node_modules call npm install --no-audit --no-fund
node check.mjs
pause
