$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$vercel = Join-Path (Split-Path -Parent $root) "vercel-cli\node_modules\.bin\vercel.cmd"

if (!(Test-Path $vercel)) {
  Write-Host "Installing Vercel CLI..."
  npm install --prefix (Join-Path (Split-Path -Parent $root) "vercel-cli") vercel@56.5.0 fs-extra
}

Set-Location $root
& $vercel --prod --yes
