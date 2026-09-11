@echo off
rem One-click repair for the console shortcut.
rem Double-click this file after moving or renaming the project folder.
rem Extra arguments are forwarded, e.g.  repair-shortcut.cmd -Switches "-Silent -Port 9700"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0repair-shortcut.ps1" -NoPause %*
echo.
pause
