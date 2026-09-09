@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Keep this file ASCII-only. UTF-8 Chinese comments break cmd.exe on GBK systems.
chcp 65001 >nul 2>&1
title Local Ops Console
set "PY_CMD="
set "PY_ARGS="

where py >nul 2>&1
if not errorlevel 1 (
  py -3.12 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)" >nul 2>&1
  if not errorlevel 1 (
    set "PY_CMD=py"
    set "PY_ARGS=-3.12"
  ) else (
    py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)" >nul 2>&1
    if not errorlevel 1 (
      set "PY_CMD=py"
      set "PY_ARGS=-3"
    )
  )
)

if not defined PY_CMD (
  where python >nul 2>&1
  if not errorlevel 1 (
    python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)" >nul 2>&1
    if not errorlevel 1 (
      set "PY_CMD=python"
      set "PY_ARGS="
    )
  )
)

if not defined PY_CMD (
  echo.
  echo ERROR: Python 3.12+ was not found.
  echo Install it from https://www.python.org/downloads/
  echo and enable "Add python.exe to PATH".
  echo.
  pause
  exit /b 127
)

echo Starting console at %CD%
echo Python: %PY_CMD% %PY_ARGS%
echo.

rem Do not pass --launcher. That path redirects stdout/stderr to console.log
rem and raises OSError 9 "invalid handle" in a Windows cmd window.
if defined PY_ARGS (
  %PY_CMD% %PY_ARGS% -X utf8 -u server.py %*
) else (
  %PY_CMD% -X utf8 -u server.py %*
)
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo server.py exited with code %RC%
  pause
)
exit /b %RC%
