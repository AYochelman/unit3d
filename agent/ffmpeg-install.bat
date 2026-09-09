@echo off
chcp 65001 >nul
title Unit 3D - install ffmpeg for the camera
cd /d "%~dp0"

echo.
echo   This printer sends its camera as a video stream, and reading video needs
echo   one extra program called ffmpeg. This downloads it into this folder only -
echo   it does not install anything into Windows and needs no administrator.
echo.
echo   About 90 MB. A few minutes on a normal connection.
echo.
pause

if exist ffmpeg.exe (
  echo.
  echo   ffmpeg.exe is already here. Nothing to do.
  echo.
  pause
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$url='https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';" ^
  "$zip=Join-Path $PWD 'ffmpeg.zip'; $out=Join-Path $PWD '.ffmpeg-tmp';" ^
  "Write-Host '  downloading...';" ^
  "Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing;" ^
  "Write-Host '  unpacking...';" ^
  "if (Test-Path $out) { Remove-Item $out -Recurse -Force }" ^
  "Expand-Archive -Path $zip -DestinationPath $out -Force;" ^
  "$exe = Get-ChildItem -Path $out -Filter ffmpeg.exe -Recurse | Select-Object -First 1;" ^
  "if (-not $exe) { throw 'ffmpeg.exe was not in the download' }" ^
  "Copy-Item $exe.FullName (Join-Path $PWD 'ffmpeg.exe') -Force;" ^
  "Remove-Item $zip -Force; Remove-Item $out -Recurse -Force;" ^
  "Write-Host '  done.'"

if not exist ffmpeg.exe (
  echo.
  echo   That did not work. Try instead, in this window:
  echo       winget install --id Gyan.FFmpeg -e
  echo   then close and reopen this window and run camera.bat.
  echo.
  pause
  exit /b 1
)

echo.
echo   ffmpeg is ready. Now close the agent window and run start.bat again.
echo.
pause
