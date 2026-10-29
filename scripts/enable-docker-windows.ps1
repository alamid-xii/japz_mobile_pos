# Run once from an Administrator PowerShell, then restart Windows yourself.
# This script never restarts the computer or removes Docker/WSL data.
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Open PowerShell using Run as administrator, then run this script again.'
}

Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart | Out-Null
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart | Out-Null
& bcdedit.exe /set hypervisorlaunchtype auto
if ($LASTEXITCODE -ne 0) { throw 'Unable to enable hypervisor startup.' }

Write-Output 'Windows features and hypervisor startup are enabled.'
Write-Output 'Save your work, restart Windows, then open Docker Desktop and wait for the Linux engine.'
Write-Output 'From the project folder, run: npm run docker:up'
