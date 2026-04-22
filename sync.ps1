# Talaga Professional Sync Tool
# 🚀 High-Efficiency Update & Deploy

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "--- Talaga Professional Sync ($timestamp) ---" -ForegroundColor Cyan

# 1. Stage all changes
Write-Host "🔍 Staging changes..." -ForegroundColor Gray
git add .

# 2. Get commit message
Write-Host "💬 Enter commit message [Press Enter for 'Professional Update - $timestamp']:" -NoNewline
$msg = Read-Host
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "Professional Update - $timestamp" }

# 3. Commit locally
Write-Host "💾 Committing..." -ForegroundColor Gray
git commit -m "$msg"

# 4. Push to GitHub
# Note: This pushes your master to remote main to keep Render & GitHub Pages in sync
Write-Host "📤 Pushing to GitHub (origin master:main)..." -ForegroundColor Yellow
git push origin master:main

Write-Host "✅ SYNC COMPLETE!" -ForegroundColor Green
Write-Host "🌐 Frontend: Live on GitHub Pages" -ForegroundColor Gray
Write-Host "⚙️ Backend: Deploying on Render (check your dashboard)" -ForegroundColor Gray
