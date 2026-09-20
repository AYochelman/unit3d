@echo off
chcp 65001 >nul
title Unit 3D - import old timelapses from a folder
cd /d "%~dp0"
where node >nul 2>nul || (echo. & echo   Node.js is not installed. & echo. & pause & exit /b 1)
if not exist node_modules npm install --no-audit --no-fund

REM  The folder the old videos are sitting in. Change this line if it moves.
set FOLDER=G:\Unit 3D Assets\Time Laps

REM  A dry run first, every time: it prints what WOULD be uploaded and stops.
REM  Nothing reaches the site until the question below is answered with Y.
node timelapse-import.mjs "%FOLDER%" --dry
echo.
choice /C YN /M "Upload these"
if errorlevel 2 goto :done
node timelapse-import.mjs "%FOLDER%"
:done
echo.
pause
