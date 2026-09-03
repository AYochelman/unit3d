@echo off
rem Unit 3D - one-click local run (Windows). Installs deps on first run, starts the dev server, opens the browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages...
  call npm install
)
start "" http://localhost:3000
call npm run dev
