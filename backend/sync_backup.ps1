# Talaga Professional Sync Tool
# Created by Antigravity

Write-Host "🚀 Starting Professional Sync..." -ForegroundColor Cyan

# 1. Stage all changes
git add .

# 2. Get commit message (defaults to 'Standard Professional Update')
$msg = Read-Host "Enter commit message (Press Enter for 'Standard Professional Update')"
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "Standard Professional Update" }

# 3. Commit locally
git commit -m "$msg"

# 4. Push to master (local) and main (Render production)
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin master:main

Write-Host "✅ Sync Complete! Your changes are now live on GitHub and Render." -ForegroundColor Green
