@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%start.ps1' -Stop"
if errorlevel 1 pause
