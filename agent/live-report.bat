@echo off
chcp 65001 >nul
title Unit 3D - live video report
cd /d "%~dp0"
echo.
echo   This takes up to a minute. The agent window must be open.
echo.
node live-report.mjs
echo.
echo   Send this whole window to Claude.
echo.
pause
