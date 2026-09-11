<#
    Console - repair the console shortcut after the project folder moved.

    A .lnk keeps absolute paths in three places: working directory, arguments
    and icon. Move or rename the project folder and the shortcut silently
    breaks - double-click does nothing and the icon goes blank.

    This script rewrites those three strings to match wherever the project
    lives NOW, leaving the header, the target list and the extra data blocks
    byte-for-byte intact.

    No administrator rights required.

    HOW TO USE
      - Double-click repair-shortcut.cmd  (one click), or
      - Right-click this file -> "Run with PowerShell", or
      - In a terminal:  .\repair-shortcut.ps1

    OPTIONS
      -LnkPath     shortcut to repair. Default: "<console name>.lnk" next to
                   this script, else the only .lnk in that folder.
      -ProjectDir  project root to point at. Default: this script's folder.
      -Switches    switches passed to start.ps1 inside the shortcut.
                   Default: "-Silent"  (no console window, no browser)
      -NoPause     do not wait for Enter before exiting.

    LIMITATION
      If the .lnk itself is missing, this cannot recreate it: building a target
      list from scratch requires COM, which is deliberately off limits here.
      Restore a .lnk.bak instead, or create the shortcut once by hand.
#>

param(
    [string]$LnkPath,
    [string]$ProjectDir,
    [string]$Switches = '-Silent',
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'

# --- flags in the shell link header -----------------------------------------
$HAS_IDLIST   = 0x01
$HAS_LINKINFO = 0x02
$HAS_NAME     = 0x04
$HAS_RELPATH  = 0x08
$HAS_WORKDIR  = 0x10
$HAS_ARGS     = 0x20
$HAS_ICON     = 0x40
$IS_UNICODE   = 0x80

function Fail($msg) {
    Write-Host ""
    Write-Host "[X] $msg" -ForegroundColor Red
    Write-Host ""
    if (-not $NoPause) { Read-Host "Press Enter to close" }
    exit 1
}

function Read-Counted([byte[]]$b, [ref]$off) {
    $n = [BitConverter]::ToUInt16($b, $off.Value)
    $s = [Text.Encoding]::Unicode.GetString($b, $off.Value + 2, $n * 2)
    $off.Value = $off.Value + 2 + $n * 2
    return $s
}

function New-Counted([string]$s) {
    $body = [Text.Encoding]::Unicode.GetBytes($s)
    $buf = New-Object byte[] ($body.Length + 2)
    $n = [uint16]$s.Length
    $buf[0] = [byte]($n -band 0xFF)
    $buf[1] = [byte](($n -shr 8) -band 0xFF)
    [Array]::Copy($body, 0, $buf, 2, $body.Length)
    return ,$buf
}

function Slice-Bytes([byte[]]$b, [int]$from, [int]$to) {
    if ($to -lt $from) { return ,(New-Object byte[] 0) }
    $out = New-Object byte[] ($to - $from + 1)
    [Array]::Copy($b, $from, $out, 0, $out.Length)
    return ,$out
}

# "console" in Chinese, built from code points so this file stays pure ASCII
# and cannot be mangled by the console code page.
$consoleZh = -join @([char]0x603B, [char]0x63A7, [char]0x53F0)

# --- resolve paths ----------------------------------------------------------

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
            Fail "No .lnk found in $ProjectDir - point at one with -LnkPath."
        } else {
            Fail "Several .lnk files in $ProjectDir - pick one with -LnkPath."
        }
    }
}
if (-not (Test-Path -LiteralPath $LnkPath)) { Fail "Shortcut not found: $LnkPath" }
$LnkPath = (Resolve-Path -LiteralPath $LnkPath).Path

Write-Host ""
Write-Host "  Project   : $ProjectDir"
Write-Host "  Shortcut  : $LnkPath"
if (-not (Test-Path -LiteralPath $scriptPath)) {
    Fail "start.ps1 not found in the project folder - is -ProjectDir correct?"
}
Write-Host "  Launcher  : $scriptPath"
Write-Host ""

# --- pick an icon -----------------------------------------------------------

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

# --- read and parse the link -------------------------------------------------

$bytes = [IO.File]::ReadAllBytes($LnkPath)
if ($bytes.Length -lt 78)              { Fail "File is too small to be a shortcut." }
if ([BitConverter]::ToUInt32($bytes, 0) -ne 0x4C) { Fail "Not a shell link (unexpected header size)." }

$flags = [BitConverter]::ToUInt32($bytes, 20)
if (-not ($flags -band $HAS_IDLIST)) { Fail "Shortcut has no target list - cannot repair safely." }
if (-not ($flags -band $IS_UNICODE)) { Fail "Shortcut is not Unicode - unsupported." }

$idSize = [BitConverter]::ToUInt16($bytes, 76)
$pos = 78 + $idSize

$header   = Slice-Bytes $bytes 0 75
$idList   = Slice-Bytes $bytes 76 ($pos - 1)
$linkInfo = New-Object byte[] 0
if ($flags -band $HAS_LINKINFO) {
    $liSize = [BitConverter]::ToUInt32($bytes, $pos)
    $linkInfo = Slice-Bytes $bytes $pos ($pos + $liSize - 1)
    $pos = $pos + $liSize
}

$origName = $null; $origRel = $null; $origWork = $null; $origArgs = $null; $origIcon = $null
if ($flags -band $HAS_NAME)    { $origName = Read-Counted $bytes ([ref]$pos) }
if ($flags -band $HAS_RELPATH) { $origRel  = Read-Counted $bytes ([ref]$pos) }
if ($flags -band $HAS_WORKDIR) { $origWork = Read-Counted $bytes ([ref]$pos) }
if ($flags -band $HAS_ARGS)    { $origArgs = Read-Counted $bytes ([ref]$pos) }
if ($flags -band $HAS_ICON)    { $origIcon = Read-Counted $bytes ([ref]$pos) }

$extra = New-Object byte[] 0
if ($pos -lt $bytes.Length) { $extra = Slice-Bytes $bytes $pos ($bytes.Length - 1) }

# --- desired values ----------------------------------------------------------

$wantWork = $ProjectDir
if ([IO.Path]::GetExtension($iconPath) -ieq '.ico') {
    $wantIcon = $iconPath
} else {
    $wantIcon = $iconPath + ',0'
}
$wantArgs = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "& ''' +
            $scriptPath + ''' ' + $Switches + '"'

Write-Host "  Desired"
Write-Host "    Start in  : $wantWork"
Write-Host "    Arguments : $wantArgs"
Write-Host "    Icon      : $wantIcon"
Write-Host ""

if ($origWork -eq $wantWork -and $origArgs -eq $wantArgs -and $origIcon -eq $wantIcon) {
    Write-Host "[OK] Shortcut already points at the current project folder - nothing to do." -ForegroundColor Green
    Write-Host ""
    if (-not $NoPause) { Read-Host "Press Enter to close" }
    exit 0
}

# --- rewrite -----------------------------------------------------------------

$backup = $LnkPath + '.bak'
Copy-Item -LiteralPath $LnkPath -Destination $backup -Force
Write-Host "  Backup    : $backup"

$newFlags = $flags -bor $HAS_WORKDIR -bor $HAS_ARGS -bor $HAS_ICON
$flagBytes = [BitConverter]::GetBytes([uint32]$newFlags)
for ($i = 0; $i -lt 4; $i++) { $header[20 + $i] = $flagBytes[$i] }

$ms = New-Object IO.MemoryStream
try {
    $ms.Write($header, 0, $header.Length)
    $ms.Write($idList, 0, $idList.Length)
    $ms.Write($linkInfo, 0, $linkInfo.Length)
    if ($origName) { $p1 = New-Counted $origName; $ms.Write($p1, 0, $p1.Length) }
    if ($origRel)  { $p2 = New-Counted $origRel;  $ms.Write($p2, 0, $p2.Length) }
    $p3 = New-Counted $wantWork; $ms.Write($p3, 0, $p3.Length)
    $p4 = New-Counted $wantArgs; $ms.Write($p4, 0, $p4.Length)
    $p5 = New-Counted $wantIcon; $ms.Write($p5, 0, $p5.Length)
    if ($extra.Length -gt 0) { $ms.Write($extra, 0, $extra.Length) }
    $out = $ms.ToArray()
}
finally {
    $ms.Dispose()
}
[IO.File]::WriteAllBytes($LnkPath, $out)

# --- verify by re-reading ----------------------------------------------------

$chk = [IO.File]::ReadAllBytes($LnkPath)
$chkFlags = [BitConverter]::ToUInt32($chk, 20)
$p = 78 + [BitConverter]::ToUInt16($chk, 76)
if ($chkFlags -band $HAS_LINKINFO) { $p = $p + [BitConverter]::ToUInt32($chk, $p) }
if ($chkFlags -band $HAS_NAME)    { [void](Read-Counted $chk ([ref]$p)) }
if ($chkFlags -band $HAS_RELPATH) { [void](Read-Counted $chk ([ref]$p)) }
$chkWork = Read-Counted $chk ([ref]$p)
$chkArgs = Read-Counted $chk ([ref]$p)
$chkIcon = Read-Counted $chk ([ref]$p)

$bad = 0
if ($chkWork -ne $wantWork) { $bad++ }
if ($chkArgs -ne $wantArgs) { $bad++ }
if ($chkIcon -ne $wantIcon) { $bad++ }
$blob = $chkWork + "`n" + $chkArgs + "`n" + $chkIcon
if ($origWork -and $origWork -ne $wantWork -and $blob.Contains($origWork)) {
    Write-Host "  verify: stale working directory still present" -ForegroundColor Yellow
    $bad++
}

Write-Host ""
if ($bad -eq 0) {
    Write-Host "[OK] Shortcut repaired." -ForegroundColor Green
} else {
    Write-Host "[!] File written but $bad verification check(s) failed." -ForegroundColor Yellow
    Write-Host "    Roll back with: Copy-Item '$backup' '$LnkPath' -Force"
}
Write-Host ""
if ($origWork -and $origWork -ne $chkWork) {
    Write-Host "  Start in  : $origWork"
    Write-Host "           -> $chkWork"
}
if ($origIcon -and $origIcon -ne $chkIcon) {
    Write-Host "  Icon      : $origIcon"
    Write-Host "           -> $chkIcon"
}
if ($origArgs -and $origArgs -ne $chkArgs) {
    Write-Host "  Arguments :"
    Write-Host "    old $origArgs"
    Write-Host "    new $chkArgs"
}
Write-Host ""
Write-Host "  Double-click the shortcut to test it."
Write-Host "  Keep '$([IO.Path]::GetFileName($backup))' as a rollback."
Write-Host ""

if (-not $NoPause) { Read-Host "Press Enter to close" }
if ($bad -ne 0) { exit 1 }
exit 0
