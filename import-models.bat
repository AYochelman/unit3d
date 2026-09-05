@echo off
rem Unit 3D - import the MakerWorld collections (double-click me).
setlocal EnableDelayedExpansion
cd /d "%~dp0"
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. Get the LTS installer from https://nodejs.org , then run this again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing packages first...
  call npm install
)

rem The data folder is created here on first run, so nobody has to go looking for it.
if not exist "data" mkdir "data"

rem Pick up makerworld-raw.json wherever the browser dropped it.
if not exist "data\makerworld-raw.json" (
  for %%D in ("%USERPROFILE%\Downloads" "%USERPROFILE%\Desktop" "%USERPROFILE%\OneDrive\Desktop" "%USERPROFILE%\OneDrive\Downloads") do (
    if exist "%%~D\makerworld-raw.json" (
      echo Found makerworld-raw.json in %%~D - copying it in.
      copy /y "%%~D\makerworld-raw.json" "data\makerworld-raw.json" >nul
      goto :gotraw
    )
  )
)
:gotraw

if exist "data\makerworld-raw.json" (
  node scripts\import-makerworld.mjs --raw %*
) else (
  echo.
  echo No data\makerworld-raw.json found, so I will try the network first.
  echo If MakerWorld blocks it: double-click collect-models.html, follow the steps,
  echo then run this file again.
  echo.
  node scripts\import-makerworld.mjs %*
)

echo.
pause
