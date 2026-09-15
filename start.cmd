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

if defined SILENT (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start.ps1" %SILENT% %EXTRA_ARGS%
    exit /b %ERRORLEVEL%
)

rem 前台控制台模式：
rem 1. 仅通过 PowerShell 完成启动前环境预检与前端构建（耗时不到 1 秒，执行完毕后 PowerShell 立即注销）
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%start.ps1' -SetupOnly"`) do set "PY_EXE=%%I"

if "%PY_EXE%"=="" (
    echo.
    echo [总控台] 启动前 Python 环境检查失败。
    pause
    exit /b 1
)

rem 2. 原生 Python 常驻运行控制台，关机时平滑退出，彻底避免 powershell.exe 崩溃报错
"%PY_EXE%" -X utf8 -u "%SCRIPT_DIR%server.py" %EXTRA_ARGS%

