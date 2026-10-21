param([switch]$Restart)

$ErrorActionPreference = 'Stop'
$workspacePath = $PSScriptRoot
$backendPath = Join-Path $workspacePath 'japz-backend'
$frontendPath = Join-Path $workspacePath 'japz-web'
$runtimeHasher = [System.Security.Cryptography.SHA256]::Create()
try {
    $workspaceHash = $runtimeHasher.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($workspacePath.ToLowerInvariant()))
    $workspaceKey = ([System.BitConverter]::ToString($workspaceHash) -replace '-', '').ToLowerInvariant().Substring(0, 12)
} finally {
    $runtimeHasher.Dispose()
}
$runtimePath = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) "JAPZ\$workspaceKey"
$nodePath = (Get-Command node -ErrorAction Stop).Source

function Test-ManagedProcess($managedProcess) {
    if (-not $managedProcess -or -not $managedProcess.StartedAt) { return $false }
    $process = Get-Process -Id $managedProcess.Id -ErrorAction SilentlyContinue
    return ($process -and $process.Path -eq $nodePath -and $process.StartTime.ToUniversalTime().ToString('o') -eq $managedProcess.StartedAt)
}

function Test-ProcessOwner([int]$processId, [int]$managedId) {
    for ($depth = 0; $depth -lt 8 -and $processId -gt 0; $depth++) {
        if ($processId -eq $managedId) { return $true }
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
        if (-not $process) { return $false }
        $processId = $process.ParentProcessId
    }
    return $false
}

function Stop-ManagedServer($managedProcess) {
    if (-not (Test-ManagedProcess $managedProcess)) {
        throw "The recorded $($managedProcess.Name) process has changed. No process was stopped."
    }
    $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($managedProcess.Id)")
    Stop-Process -Id $managedProcess.Id -Force
    foreach ($child in $children) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($child.ProcessId)"
        if ($process -and $process.CreationDate -eq $child.CreationDate -and $process.ExecutablePath -eq $nodePath) {
            Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
        }
    }
}

foreach ($requiredPath in @(
    (Join-Path $backendPath '.env'),
    (Join-Path $backendPath 'node_modules\express'),
    (Join-Path $frontendPath '.env.local'),
    (Join-Path $frontendPath 'node_modules\vite\bin\vite.js')
)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Missing setup file: $requiredPath. See LOCAL_SETUP.md."
    }
}

if (-not (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue)) {
    throw 'Start MySQL in Laragon before starting JAPZ.'
}

New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
$processFile = Join-Path $runtimePath 'processes.json'
$knownProcesses = @()
if (Test-Path -LiteralPath $processFile) {
    $knownProcesses = Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json
}

$servers = @(
    @{ Name = 'backend'; Port = 3000; Directory = $backendPath; Arguments = @('--watch', '--watch-preserve-output', 'index.js'); Url = 'http://127.0.0.1:3000/api/menu-categories' },
    @{ Name = 'frontend'; Port = 5173; Directory = $frontendPath; Arguments = @('node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5173', '--strictPort'); Url = 'http://127.0.0.1:5173/login' }
)
$runningProcesses = @()

# Check both ports before starting or restarting anything. Watch mode runs the
# backend in a child process, so its listener can have a different PID.
foreach ($server in $servers) {
    $server.ManagedProcess = $knownProcesses | Where-Object { $_.Name -eq $server.Name -and $_.Port -eq $server.Port -and (Test-ManagedProcess $_) } | Select-Object -First 1
    $listeners = @(Get-NetTCPConnection -LocalPort $server.Port -State Listen -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        if (-not $server.ManagedProcess -or -not (Test-ProcessOwner $listener.OwningProcess $server.ManagedProcess.Id)) {
            throw "Port $($server.Port) is in use by another process. No process was stopped."
        }
    }
}

if ($Restart) {
    foreach ($server in $servers) {
        if ($server.ManagedProcess) {
            Stop-ManagedServer $server.ManagedProcess
            $server.ManagedProcess = $null
        }
    }
}

foreach ($server in $servers) {
    if ($server.ManagedProcess) {
        $runningProcesses += $server.ManagedProcess
        Write-Output "$($server.Name) is already running (PID $($server.ManagedProcess.Id))."
    } else {
        $serverProcess = Start-Process -FilePath $nodePath -ArgumentList $server.Arguments -WorkingDirectory $server.Directory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath "$($server.Name).log") -RedirectStandardError (Join-Path $runtimePath "$($server.Name).error.log") -PassThru
        $runningProcesses += [PSCustomObject]@{ Name = $server.Name; Id = $serverProcess.Id; Port = $server.Port; StartedAt = $serverProcess.StartTime.ToUniversalTime().ToString('o') }
        ConvertTo-Json -InputObject @($runningProcesses) | Set-Content -LiteralPath $processFile -Encoding UTF8
        Write-Output "Started $($server.Name) (PID $($serverProcess.Id))."
    }
}

ConvertTo-Json -InputObject @($runningProcesses) | Set-Content -LiteralPath $processFile -Encoding UTF8
foreach ($server in $servers) {
    $ready = $false
    $startupDeadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
        try {
            $response = Invoke-WebRequest -Uri $server.Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch {
            $runningProcess = $runningProcesses | Where-Object { $_.Name -eq $server.Name } | Select-Object -First 1
            if (-not (Get-Process -Id $runningProcess.Id -ErrorAction SilentlyContinue)) {
                throw "$($server.Name) exited. Check $runtimePath for logs."
            }
            Start-Sleep -Milliseconds 500
        }
    } while ([DateTime]::UtcNow -lt $startupDeadline)
    if (-not $ready) {
        throw "$($server.Name) did not become ready. Check $runtimePath for logs."
    }
}

Write-Output 'JAPZ is ready: http://localhost:5173/login'
Write-Output 'Inventory: http://localhost:5173/inventory/overview'
Write-Output 'Inventory settings: http://localhost:5173/inventory/settings'
Write-Output 'Admin inventory: http://localhost:5173/admin/inventory/overview'
Write-Output 'Saved frontend changes update through Vite; saved backend modules restart automatically.'
Write-Output 'After changing environment settings or dependencies, run .\start-local.ps1 -Restart.'
Write-Output "Local logs, process IDs and verification files: $runtimePath"
