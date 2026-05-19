[CmdletBinding()]
param(
  [switch]$Build
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$Services = @('mysql', 'backend', 'frontend')

function Write-Step {
  param([string]$Message)
  Write-Host "[Campus Trade] $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command '$Name' was not found. Install it first, then run this script again."
  }
}

function Invoke-Docker {
  param([string[]]$Arguments)

  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Assert-DockerReady {
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not available. Start Docker Desktop, then run this script again."
  }
}

function Assert-DockerComposeReady {
  & docker compose version *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose is not available. Install or update Docker Desktop, then run this script again."
  }
}

function Wait-HttpReady {
  param(
    [string]$Name,
    [string]$Url,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        Write-Ok "$Name is reachable at $Url"
        return
      }
    } catch {
      Start-Sleep -Seconds 2
      continue
    }

    Start-Sleep -Seconds 2
  }

  throw "$Name did not respond at $Url within $TimeoutSeconds seconds."
}

try {
  Write-Step "Checking prerequisites..."
  Assert-Command 'docker'
  Assert-DockerReady
  Assert-DockerComposeReady

  Write-Step "Starting services with Docker Compose..."
  $composeArgs = @('compose', 'up', '-d')
  if ($Build) {
    $composeArgs += '--build'
  }
  $composeArgs += $Services
  Invoke-Docker $composeArgs

  Write-Step "Current container status..."
  Invoke-Docker @('compose', 'ps')

  Write-Step "Checking HTTP endpoints..."
  Wait-HttpReady 'Backend API' 'http://localhost:3001/api/health' 120
  Wait-HttpReady 'Frontend' 'http://localhost' 120

  Write-Host ''
  Write-Ok 'Campus Trade is running.'
  Write-Host 'Frontend: http://localhost'
  Write-Host 'Backend health: http://localhost:3001/api/health'
  Write-Host 'MySQL: localhost:3307'
  Write-Host ''
  Write-Host 'Test account: user1@campustrade.com / Password123!'
  Write-Host "View logs: docker compose logs -f $($Services -join ' ')"
} catch {
  Write-Host ''
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "No files or database data were deleted by this script."
  exit 1
}
