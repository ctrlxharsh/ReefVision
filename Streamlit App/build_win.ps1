<#
.SYNOPSIS
    Andromeida Reef Vision Studio — Windows 1-Click Builder
.DESCRIPTION
    Automatically verifies or installs Python 3, sets up a dedicated virtual environment,
    installs all required dependencies, compiles the standalone application with PyInstaller,
    and launches the executable for immediate use.
#>

$ErrorActionPreference = "Stop"

# Navigate to script root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Andromeida Reef Vision Studio — Windows 1-Click Builder" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Check for Python
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py -3"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
}

if (-not $pythonCmd) {
    Write-Host "==> Python not found in system PATH. Attempting automatic installation..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "==> Installing Python 3.12 via winget..." -ForegroundColor Green
        try {
            winget install --id Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements
        } catch {
            Write-Warning "Winget installation encountered an issue. Falling back to direct installer..."
        }
    }

    # If still not found, download official Windows installer
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Write-Host "==> Downloading official Python 3.12 installer from python.org..." -ForegroundColor Green
        $installerUrl = "https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe"
        $installerPath = "$env:TEMP\python-3.12.9-amd64.exe"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
        
        Write-Host "==> Installing Python silently..." -ForegroundColor Green
        Start-Process -FilePath $installerPath -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1" -Wait
        Remove-Item -Force $installerPath -ErrorAction SilentlyContinue
    }

    # Refresh PATH environment variable for the current session
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
    $env:Path = "$machinePath;$userPath"

    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonCmd = "python"
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        $pythonCmd = "py -3"
    } else {
        Write-Error "Python was installed, but could not be resolved in the current session. Please restart your shell and re-run build_win.bat."
        exit 1
    }
}

Write-Host "==> Python detected: $(& $pythonCmd.Split()[0] --version)" -ForegroundColor Green

# 2. Virtual environment setup
if (-not (Test-Path ".venv")) {
    Write-Host "==> Creating virtual environment (.venv)..." -ForegroundColor Green
    if ($pythonCmd -eq "py -3") {
        py -3 -m venv .venv
    } else {
        & $pythonCmd -m venv .venv
    }
}

$venvPython = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Error "Virtual environment python executable not found at $venvPython"
    exit 1
}

# 3. Upgrade pip and install requirements
Write-Host "==> Ensuring pip is available inside virtual environment..." -ForegroundColor Green
& $venvPython -m ensurepip --upgrade --quiet 2>$null

Write-Host "==> Installing / updating dependencies..." -ForegroundColor Green
& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r requirements.txt --quiet

# Optional DirectML acceleration check (DirectX 12 GPU on Windows)
if ($env:ENABLE_DIRECTML -eq "1") {
    Write-Host "==> Installing onnxruntime-directml for hardware acceleration..." -ForegroundColor Green
    & $venvPython -m pip install onnxruntime-directml --quiet
}

# 4. Compile application with PyInstaller
Write-Host "==> Building native Windows application with PyInstaller..." -ForegroundColor Green
& $venvPython -m PyInstaller --clean -y coralseg.spec

# 5. Verify build output
$onedirExe = "dist\AndromeidaReefVision\AndromeidaReefVision.exe"
$onefileExe = "dist\AndromeidaReefVision.exe"

$targetExe = $null
if (Test-Path $onedirExe) {
    $targetExe = (Resolve-Path $onedirExe).Path
} elseif (Test-Path $onefileExe) {
    $targetExe = (Resolve-Path $onefileExe).Path
}

if (-not $targetExe) {
    Write-Error "Build completed, but could not locate AndromeidaReefVision.exe in dist\"
    exit 1
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  BUILD SUCCESSFUL! 🎉" -ForegroundColor Green
Write-Host "  Executable: $targetExe" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan

# 6. Auto-open application and highlight in Windows Explorer
Write-Host "==> Launching Andromeida Reef Vision Studio..." -ForegroundColor Green
Start-Process -FilePath $targetExe

Write-Host "==> Revealing executable location in Windows Explorer..." -ForegroundColor Green
& explorer.exe /select,"$targetExe"
