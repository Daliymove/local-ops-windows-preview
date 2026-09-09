param(
    [int]$Port = 0,
    [switch]$NoBrowser,
    [switch]$RebuildFrontend,
    [switch]$Dev
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
            $py12 = py -3.12 -c "import sys; print(sys.version_info[0:2] >= (3, 12))" 2>$null
            if ($py12 -match "True") {
                return @("py", "-3.12")
            }
            $py3 = py -3 -c "import sys; print(sys.version_info[0:2] >= (3, 12))" 2>$null
            if ($py3 -match "True") {
                return @("py", "-3")
            }
        }
        if (Get-Command python -ErrorAction SilentlyContinue) {
            $pyAny = python -c "import sys; print(sys.version_info[0:2] >= (3, 12))" 2>$null
            if ($pyAny -match "True") {
                return @("python")
            }
        }
        throw "Python 3.12+ not found. Please install Python 3.12 or newer."
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

$pyTokens = Resolve-Python
$pyExe = $pyTokens[0]
$pyArgs = if ($pyTokens.Count -gt 1) { $pyTokens[1..($pyTokens.Count - 1)] } else { @() }

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

$serverScript = Join-Path $appDir "server.py"
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
Write-Host "Python: $($pyTokens -join ' ')"
Write-Host ""

& $pyExe @pyArgs @serverArgs
