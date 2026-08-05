@echo off
REM Portable launcher: tries a tiny local server if Python exists, else opens index.html
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  echo Starting local server at http://127.0.0.1:8765
  echo Close this window to stop the server.
  start "" "http://127.0.0.1:8765"
  python -m http.server 8765
  exit /b
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Starting local server at http://127.0.0.1:8765
  start "" "http://127.0.0.1:8765"
  py -3 -m http.server 8765
  exit /b
)

start "" "%~dp0index.html"
