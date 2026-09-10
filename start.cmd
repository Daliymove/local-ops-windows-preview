@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "SILENT="
set "EXTRA_ARGS="

:parse_args
if "%~1"=="" goto done_args
if /i "%~1"=="/b" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="-b" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="/s" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="-s" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="/silent" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="-silent" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="--silent" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="/background" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="-background" (set "SILENT=-Silent" & shift /1 & goto parse_args)
if /i "%~1"=="--background" (set "SILENT=-Silent" & shift /1 & goto parse_args)
set EXTRA_ARGS=%EXTRA_ARGS% %1
shift /1
goto parse_args

:done_args
if /i "%CONSOLE_SILENT%"=="1" set "SILENT=-Silent"
if /i "%CONSOLE_BACKGROUND%"=="1" set "SILENT=-Silent"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start.ps1" %SILENT% %EXTRA_ARGS%
if errorlevel 1 pause
