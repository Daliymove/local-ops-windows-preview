param(
    [int]$Port = 0,
    [switch]$NoBrowser,
    [switch]$RebuildFrontend,
    [switch]$Dev,
    [switch]$Silent,
    [switch]$Background,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $appDir "frontend"
$frontendIndex = Join-Path $frontendDir "dist\index.html"

function Resolve-Python {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            & py -3.12 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) {
                return (& py -3.12 -c "import sys; print(sys.executable)").Trim()
            }
            & py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) {
                return (& py -3 -c "import sys; print(sys.executable)").Trim()
            }
        }
        if (Get-Command python -ErrorAction SilentlyContinue) {
            & python -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) {
                return (& python -c "import sys; print(sys.executable)").Trim()
            }
        }
        throw "Python 3.12+ not found. Please install Python 3.12 or newer."
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

$pyExe = Resolve-Python
$serverScript = Join-Path $appDir "server.py"

if ($Stop) {
    & $pyExe -X utf8 -u $serverScript --stop
    exit $LASTEXITCODE
}

# Check if frontend needs build or dependency install
if (Test-Path -LiteralPath $frontendDir) {
    $sourceFiles = @(Get-ChildItem -Path (Join-Path $frontendDir "src") -Recurse -File -ErrorAction SilentlyContinue)
    $sourceFiles += (Get-Item (Join-Path $frontendDir "index.html") -ErrorAction SilentlyContinue)
    $sourceFiles += (Get-Item (Join-Path $frontendDir "package.json") -ErrorAction SilentlyContinue)
    $sourceFiles += (Get-Item (Join-Path $frontendDir "vite.config.ts") -ErrorAction SilentlyContinue)

    $latestSource = $sourceFiles | Where-Object { $_ } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $needsBuild = $RebuildFrontend -or -not (Test-Path -LiteralPath $frontendIndex)
    if (-not $needsBuild -and $latestSource -and (Test-Path -LiteralPath $frontendIndex)) {
        $needsBuild = $latestSource.LastWriteTime -gt (Get-Item -LiteralPath $frontendIndex).LastWriteTime
    }

    if ($needsBuild) {
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "node_modules"))) {
                Write-Host "Installing frontend dependencies..."
                & npm install --prefix $frontendDir
            }
            Write-Host "Building frontend (React 19 + Vite)..."
            & npm run build --prefix $frontendDir
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Frontend build failed. Will try running with existing assets or backend fallback."
            }
        }
        elseif (Test-Path -LiteralPath $frontendIndex) {
            Write-Warning "Frontend source changed, but npm is not available. Using existing dist build."
        }
        else {
            Write-Warning "npm not found and frontend/dist not found. Server will fallback to static/."
        }
    }
}

if ($Silent -or $Background) {
    $pyw = $pyExe -replace 'python\.exe$', 'pythonw.exe'
    if (-not (Test-Path -LiteralPath $pyw)) {
        $pyw = $pyExe
    }
    $bgArgs = @("-X", "utf8", "-u", "server.py", "--launcher")
    if ($Port -gt 0) {
        $bgArgs += @("--preferred-port", [string]$Port)
    }
    if ($NoBrowser) {
        $bgArgs += "--no-browser"
    }
    if ($Dev) {
        $bgArgs += "--dev"
    }
    if ($args) {
        $bgArgs += $args
    }

    $proc = Start-Process -FilePath $pyw -ArgumentList $bgArgs -WorkingDirectory $appDir -WindowStyle Hidden -PassThru
    Write-Host "Local Ops Console started in background (PID: $($proc.Id))."
    Write-Host "Web UI: http://127.0.0.1:9600/"
    Write-Host "To stop: Run .\stop.cmd or use 'Stop Console' in Web UI."
    exit 0
}

$serverArgs = @("-X", "utf8", "-u", $serverScript)

if ($Port -gt 0) {
    $serverArgs += @("--preferred-port", [string]$Port)
}
if ($NoBrowser) {
    $serverArgs += "--no-browser"
}
if ($Dev) {
    $serverArgs += "--dev"
}
if ($args) {
    $serverArgs += $args
}

Write-Host "Starting Local Ops Console: $appDir"
Write-Host "Python: $pyExe"
Write-Host ""

& $pyExe @serverArgs
