$ErrorActionPreference = "Stop"
$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $appDir "server.py"

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
        throw "Python 3.12+ not found."
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

$pyExe = Resolve-Python
& $pyExe -X utf8 -u $serverScript --stop
