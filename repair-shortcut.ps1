<#
    Console - rebuild the console shortcut for the current computer.

    A .lnk stores the target as a machine-specific ID list plus a Tracker
    block (original computer name / volume). Copying the project to another
    PC, or only rewriting the icon/argument strings, leaves a shortcut that
    can show the right icon but will not launch.

    This script recreates the .lnk via COM on THIS computer:
      target          = Python runtime (pythonw.exe, natively windowless GUI subsystem)
      args            = -X utf8 -u "<project>\server.py" --launcher
      start in / icon = current project folder

    Completely eliminates PowerShell wrapper and Base64 EncodedCommand payloads,
    preventing heuristic antivirus false-positives (TrojanDownloader/LNK.Agent.g)
    and ensuring true zero-console flicker launch.

    No administrator rights required.

    HOW TO USE
      - Double-click repair-shortcut.cmd  (one click), or
      - Right-click this file -> "Run with PowerShell", or
      - In a terminal:  .\repair-shortcut.ps1

    OPTIONS
      -LnkPath     shortcut to write. Default: "<console name>.lnk" next to
                   this script, else the only .lnk in that folder.
      -ProjectDir  project root to point at. Default: this script's folder.
      -Switches    optional extra switches passed to the console, e.g. "-Port 9700".
      -NoPause     do not wait for Enter before exiting.
#>

param(
    [string]$LnkPath,
    [string]$ProjectDir,
    [string]$Switches = '',
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

function Convert-SwitchesToArgs([string]$ExtraSwitches) {
    if (-not $ExtraSwitches) { return @() }
    $parts = $ExtraSwitches -split '\s+' | Where-Object { $_ }
    $result = @()
    $i = 0
    while ($i -lt $parts.Length) {
        $p = $parts[$i]
        if ($p -ieq '-Port' -and ($i + 1) -lt $parts.Length) {
            $result += @('--preferred-port', $parts[$i + 1])
            $i += 2
            continue
        }
        if ($p -ieq '-NoBrowser') {
            $result += '--no-browser'
            $i++
            continue
        }
        if ($p -ieq '-Dev') {
            $result += '--dev'
            $i++
            continue
        }
        if ($p -ieq '-Silent' -or $p -ieq '-Background') {
            # pythonw.exe is natively windowless; ignore shell silent flags
            $i++
            continue
        }
        $result += $p
        $i++
    }
    return $result
}

function Get-ShortcutArguments([string]$ServerScriptPath, [string]$ExtraSwitches) {
    $argsList = @("-X", "utf8", "-u", "`"$ServerScriptPath`"", "--launcher")
    $extra = Convert-SwitchesToArgs $ExtraSwitches
    if ($extra -and $extra.Count -gt 0) {
        $argsList += $extra
    }
    return $argsList -join " "
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
        # 1 = Normal window. Because pythonw.exe is an IMAGE_SUBSYSTEM_WINDOWS_GUI binary,
        # Windows will not allocate or show any console window.
        $shortcut.WindowStyle = 1
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

function Resolve-PythonwExecutable([string]$ScriptPath) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $pyExe = $null
        # 1. Prefer start.ps1 -SetupOnly to run environment checks and frontend build
        if ($ScriptPath -and (Test-Path -LiteralPath $ScriptPath)) {
            $setupOut = & $ScriptPath -SetupOnly 2>$null
            if ($LASTEXITCODE -eq 0 -and $setupOut) {
                $pyExe = ($setupOut | Select-Object -First 1).ToString().Trim()
            }
        }
        # 2. Standalone fallback detection for Python 3.12+
        if (-not $pyExe -or -not (Test-Path -LiteralPath $pyExe)) {
            if (Get-Command py -ErrorAction SilentlyContinue) {
                & py -3.12 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $pyExe = (& py -3.12 -c "import sys; print(sys.executable)").Trim()
                } else {
                    & py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        $pyExe = (& py -3 -c "import sys; print(sys.executable)").Trim()
                    }
                }
            }
        }
        if (-not $pyExe -or -not (Test-Path -LiteralPath $pyExe)) {
            if (Get-Command python -ErrorAction SilentlyContinue) {
                & python -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $pyExe = (& python -c "import sys; print(sys.executable)").Trim()
                }
            }
        }
        if (-not $pyExe -or -not (Test-Path -LiteralPath $pyExe)) {
            return $null
        }

        # Prefer pythonw.exe (windowless GUI subsystem), fallback to python.exe
        $pyw = $pyExe -replace 'python\.exe$', 'pythonw.exe'
        if (Test-Path -LiteralPath $pyw) {
            return $pyw
        }
        return $pyExe
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
$serverScript = Join-Path $ProjectDir 'server.py'

if (-not (Test-Path -LiteralPath $serverScript)) {
    Fail "server.py not found in the project folder - is -ProjectDir correct?"
}

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
Write-Host "  Server    : $serverScript"
Write-Host ""

$assetsDir = Join-Path $ProjectDir 'static\assets'
$iconPath = Join-Path $assetsDir 'favicon.ico'
if (-not (Test-Path -LiteralPath $iconPath)) {
    $ico = @(Get-ChildItem -LiteralPath $assetsDir -Filter *.ico -File -ErrorAction SilentlyContinue)
    if ($ico.Count -ge 1) {
        $iconPath = $ico[0].FullName
    } else {
        $iconPath = $null
    }
}

Write-Host "  Detecting Python runtime (Python 3.12+)..."
$targetExe = Resolve-PythonwExecutable -ScriptPath $scriptPath
if (-not $targetExe) {
    Fail "Python 3.12+ was not found on this computer.`n      Please install Python 3.12 or newer and make sure 'py' or 'python' is on PATH,`n      then run repair-shortcut.cmd again."
}

if (-not $iconPath) {
    $iconPath = $targetExe
    Write-Host "  Note      : no .ico under static\assets - using executable icon." -ForegroundColor Yellow
}

$wantWork = $ProjectDir
$wantIcon = $iconPath + ',0'
$wantArgs = Get-ShortcutArguments -ServerScriptPath $serverScript -ExtraSwitches $Switches

Write-Host "  Desired"
Write-Host "    Target    : $targetExe"
Write-Host "    Start in  : $wantWork"
Write-Host "    Arguments : $wantArgs"
Write-Host "    Icon      : $wantIcon"
Write-Host ""

$existed = Test-Path -LiteralPath $LnkPath
$backup = $null
if ($existed) {
    $backup = $LnkPath + '.bak'
    Copy-Item -LiteralPath $LnkPath -Destination $backup -Force
    Write-Host "  Backup    : $backup"
}

$created = Save-ShortcutViaCom -TargetLnk $LnkPath -TargetExe $targetExe -Arguments $wantArgs -WorkDir $wantWork -Icon $wantIcon
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
if (-not (Same-Path $chk.TargetPath $targetExe)) {
    Write-Host "  verify: target is $($chk.TargetPath) (expected $targetExe)" -ForegroundColor Yellow
    $bad++
}
if ($chk.Arguments -ne $wantArgs) {
    Write-Host "  verify: arguments mismatch" -ForegroundColor Yellow
    Write-Host "          actual:   $($chk.Arguments)" -ForegroundColor Yellow
    Write-Host "          expected: $wantArgs" -ForegroundColor Yellow
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
    Write-Host "[OK] Shortcut rebuilt for this computer (native pythonw, zero AV false-positive)." -ForegroundColor Green
} else {
    Write-Host "[OK] Shortcut created successfully (native pythonw, zero AV false-positive)." -ForegroundColor Green
}

Write-Host ""
Write-Host "  Double-click the shortcut to test it."
if ($backup) {
    Write-Host "  Keep '$([IO.Path]::GetFileName($backup))' as a rollback."
}
Write-Host ""

if (-not $NoPause) { Read-Host "Press Enter to close" }
exit 0
