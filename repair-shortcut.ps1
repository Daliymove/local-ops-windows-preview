<#
    Console - rebuild the console shortcut for the current computer.

    A .lnk stores the target as a machine-specific ID list plus a Tracker
    block (original computer name / volume). Copying the project to another
    PC, or only rewriting the icon/argument strings, leaves a shortcut that
    can show the right icon but will not launch.

    This script always recreates the .lnk via COM on THIS computer:
      target  = Windows PowerShell
      args    = -EncodedCommand (UTF-16, safe for Chinese / spaces)
      start in / icon = current project folder

    No administrator rights required.

    HOW TO USE
      - Double-click repair-shortcut.cmd  (one click), or
      - Right-click this file -> "Run with PowerShell", or
      - In a terminal:  .\repair-shortcut.ps1

    OPTIONS
      -LnkPath     shortcut to write. Default: "<console name>.lnk" next to
                   this script, else the only .lnk in that folder.
      -ProjectDir  project root to point at. Default: this script's folder.
      -Switches    switches passed to start.ps1 inside the shortcut.
                   Default: "-Silent"  (no console window)
      -NoPause     do not wait for Enter before exiting.
#>

param(
    [string]$LnkPath,
    [string]$ProjectDir,
    [string]$Switches = '-Silent',
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'

function Fail($msg) {
    Write-Host ""
    Write-Host "[X] $msg" -ForegroundColor Red
    Write-Host ""
    if (-not $NoPause) { Read-Host "Press Enter to close" }
    exit 1
}

function Same-Path([string]$Left, [string]$Right) {
    if (-not $Left -or -not $Right) { return $false }
    try {
        $a = [IO.Path]::GetFullPath($Left).TrimEnd('\')
        $b = [IO.Path]::GetFullPath($Right).TrimEnd('\')
        return $a -ieq $b
    } catch {
        return $false
    }
}

function Get-ShortcutArguments([string]$ScriptPath, [string]$WorkDir, [string]$ExtraSwitches) {
    $escapedScript = $ScriptPath.Replace("'", "''")
    $escapedDir = $WorkDir.Replace("'", "''")
    $safeSwitches = [string]$ExtraSwitches
    $command = @(
        "`$ErrorActionPreference = 'Stop'"
        "Set-Location -LiteralPath '$escapedDir'"
        "& '$escapedScript' $safeSwitches"
    ) -join "`n"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    return "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand $encoded"
}

function Save-ShortcutViaCom([string]$TargetLnk, [string]$TargetExe, [string]$Arguments, [string]$WorkDir, [string]$Icon) {
    $ws = $null
    $shortcut = $null
    try {
        $ws = New-Object -ComObject WScript.Shell
        $shortcut = $ws.CreateShortcut($TargetLnk)
        $shortcut.TargetPath = $TargetExe
        $shortcut.Arguments = $Arguments
        $shortcut.WorkingDirectory = $WorkDir
        $shortcut.IconLocation = $Icon
        $shortcut.WindowStyle = 7
        $shortcut.Save()
        return $true
    } catch {
        Write-Host "  COM save failed: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    } finally {
        if ($shortcut) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shortcut) }
        if ($ws) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ws) }
    }
}

function Read-ShortcutViaCom([string]$TargetLnk) {
    $ws = $null
    $shortcut = $null
    try {
        $ws = New-Object -ComObject WScript.Shell
        $shortcut = $ws.CreateShortcut($TargetLnk)
        return [pscustomobject]@{
            TargetPath       = [string]$shortcut.TargetPath
            Arguments        = [string]$shortcut.Arguments
            WorkingDirectory = [string]$shortcut.WorkingDirectory
            IconLocation     = [string]$shortcut.IconLocation
        }
    } finally {
        if ($shortcut) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shortcut) }
        if ($ws) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ws) }
    }
}

function Test-Python312 {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            & py -3.12 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) { return $true }
            & py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) { return $true }
        }
        if (Get-Command python -ErrorAction SilentlyContinue) {
            & python -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) { return $true }
        }
        return $false
    } finally {
        $ErrorActionPreference = $prev
    }
}

# "console" in Chinese, built from code points so this file stays pure ASCII
# and cannot be mangled by the console code page.
$consoleZh = -join @([char]0x603B, [char]0x63A7, [char]0x53F0)

if (-not $ProjectDir) {
    $ProjectDir = $PSScriptRoot
    if (-not $ProjectDir) { $ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
}
if (-not (Test-Path -LiteralPath $ProjectDir)) { Fail "Project folder not found: $ProjectDir" }
$ProjectDir = (Resolve-Path -LiteralPath $ProjectDir).Path
$scriptPath = Join-Path $ProjectDir 'start.ps1'

if (-not $LnkPath) {
    $preferred = Join-Path $ProjectDir ($consoleZh + '.lnk')
    if (Test-Path -LiteralPath $preferred) {
        $LnkPath = $preferred
    } else {
        $found = @(Get-ChildItem -LiteralPath $ProjectDir -Filter *.lnk -File -ErrorAction SilentlyContinue |
                   Where-Object { $_.Name -notlike '*.bak' })
        if ($found.Count -eq 1) {
            $LnkPath = $found[0].FullName
        } elseif ($found.Count -eq 0) {
            $LnkPath = $preferred
        } else {
            Fail "Several .lnk files in $ProjectDir - pick one with -LnkPath."
        }
    }
}

Write-Host ""
Write-Host "  Project   : $ProjectDir"
Write-Host "  Shortcut  : $LnkPath"
if (-not (Test-Path -LiteralPath $scriptPath)) {
    Fail "start.ps1 not found in the project folder - is -ProjectDir correct?"
}
Write-Host "  Launcher  : $scriptPath"
Write-Host ""

$assetsDir = Join-Path $ProjectDir 'static\assets'
$iconPath = Join-Path $assetsDir 'favicon.ico'
if (-not (Test-Path -LiteralPath $iconPath)) {
    $ico = @(Get-ChildItem -LiteralPath $assetsDir -Filter *.ico -File -ErrorAction SilentlyContinue)
    if ($ico.Count -ge 1) {
        $iconPath = $ico[0].FullName
    } else {
        $iconPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        Write-Host "  Note      : no .ico under static\assets - using the PowerShell icon." -ForegroundColor Yellow
    }
}

$psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if (-not (Test-Path -LiteralPath $psExe)) {
    Fail "Windows PowerShell not found: $psExe"
}

$wantWork = $ProjectDir
$wantIcon = $iconPath + ',0'
$wantArgs = Get-ShortcutArguments -ScriptPath $scriptPath -WorkDir $wantWork -ExtraSwitches $Switches

Write-Host "  Desired"
Write-Host "    Target    : $psExe"
Write-Host "    Start in  : $wantWork"
Write-Host "    Script    : $scriptPath $Switches"
Write-Host "    Icon      : $wantIcon"
Write-Host ""

$existed = Test-Path -LiteralPath $LnkPath
$backup = $null
if ($existed) {
    $backup = $LnkPath + '.bak'
    Copy-Item -LiteralPath $LnkPath -Destination $backup -Force
    Write-Host "  Backup    : $backup"
}

$created = Save-ShortcutViaCom -TargetLnk $LnkPath -TargetExe $psExe -Arguments $wantArgs -WorkDir $wantWork -Icon $wantIcon
if (-not $created) {
    if ($backup -and (Test-Path -LiteralPath $backup)) {
        Copy-Item -LiteralPath $backup -Destination $LnkPath -Force
    }
    Fail "Could not create shortcut via COM: $LnkPath"
}

$chk = Read-ShortcutViaCom -TargetLnk $LnkPath
$iconFile = $chk.IconLocation
if ($iconFile -and $iconFile.Contains(',')) {
    $iconFile = $iconFile.Substring(0, $iconFile.LastIndexOf(','))
}

$bad = 0
if (-not (Same-Path $chk.TargetPath $psExe)) {
    Write-Host "  verify: target is $($chk.TargetPath)" -ForegroundColor Yellow
    $bad++
}
if ($chk.Arguments -ne $wantArgs) {
    Write-Host "  verify: arguments were not stored as EncodedCommand" -ForegroundColor Yellow
    $bad++
}
if (-not (Same-Path $chk.WorkingDirectory $wantWork)) {
    Write-Host "  verify: working directory is $($chk.WorkingDirectory)" -ForegroundColor Yellow
    $bad++
}
if (-not (Same-Path $iconFile $iconPath)) {
    Write-Host "  verify: icon is $($chk.IconLocation)" -ForegroundColor Yellow
    $bad++
}

Write-Host ""
if ($bad -ne 0) {
    if ($backup -and (Test-Path -LiteralPath $backup)) {
        Write-Host "    Roll back with: Copy-Item '$backup' '$LnkPath' -Force"
    }
    Fail "Shortcut was written but $bad verification check(s) failed."
}

if ($existed) {
    Write-Host "[OK] Shortcut rebuilt for this computer." -ForegroundColor Green
} else {
    Write-Host "[OK] Shortcut created successfully." -ForegroundColor Green
}

if (-not (Test-Python312)) {
    Write-Host ""
    Write-Host "[!] Python 3.12+ was not found on this computer." -ForegroundColor Yellow
    Write-Host "    The shortcut icon is ready, but the console cannot start until Python is installed"
    Write-Host "    and available as 'py' or 'python' on PATH."
}

Write-Host ""
Write-Host "  Double-click the shortcut to test it."
if ($backup) {
    Write-Host "  Keep '$([IO.Path]::GetFileName($backup))' as a rollback."
}
Write-Host ""

if (-not $NoPause) { Read-Host "Press Enter to close" }
exit 0
