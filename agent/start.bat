@echo off
chcp 65001 >nul
title Unit 3D - printer agent
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed.
  echo   Install it from https://nodejs.org  ^(the LTS button^), then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo   First run - installing what the agent needs. This takes a minute.
  echo.
  call npm install --no-audit --no-fund || (echo. & echo   install failed & pause & exit /b 1)
)

if not exist config.json (
  echo.
  node setup.mjs || (pause & exit /b 1)
)

echo.
echo   Running. Leave this window open. Close it to stop.
echo.
node printer-agent.mjs
echo.
echo   The agent stopped.
pause
