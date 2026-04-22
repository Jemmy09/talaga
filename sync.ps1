# Talaga Professional Sync Tool (v2.0)
# High-Efficiency Update & Deploy

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "--- Talaga Professional Sync ($timestamp) ---" -ForegroundColor Cyan

# 1. Pull latest from GitHub (Safety First)
Write-Host "Pulling remote updates..." -ForegroundColor Gray
git pull origin main --rebase

# 2. Stage all local changes
Write-Host "Staging local changes..." -ForegroundColor Gray
git add .

# 3. Get commit message
Write-Host "Enter commit message [Press Enter for 'Professional Update - $timestamp']:" -NoNewline
$msg = Read-Host
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "Professional Update - $timestamp" }

# 4. Commit locally
Write-Host "Committing..." -ForegroundColor Gray
git commit -m "$msg"

# 5. Push to GitHub
Write-Host "Pushing to GitHub (main)..." -ForegroundColor Yellow
git push origin main

Write-Host "SYNC COMPLETE!" -ForegroundColor Green
Write-Host "Frontend: Live on GitHub Pages" -ForegroundColor Gray
Write-Host "Backend: Deploying on Render" -ForegroundColor Gray
