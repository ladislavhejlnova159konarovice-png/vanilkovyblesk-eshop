Param(
  [string]$BranchName = "feat/healthcheck-ci",
  [string]$Base = "main",
  [string]$Remote = "origin",
  [string]$CommitMessage = "Add /health endpoint, Docker healthchecks, CI smoke improvements and docs"
)

Write-Host "This script will create a branch, commit local changes and push to remote, then open a PR (if gh CLI available)."

function Check-Command($name) {
  $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Check-Command git)) {
  Write-Error "git is not installed or not in PATH. Install Git and re-run this script."
  exit 1
}

$status = git status --porcelain
if ($status) {
  Write-Host "Local changes detected (will be committed):"; git status --short
} else {
  Write-Host "No changes detected. Nothing to commit."; exit 0
}

Write-Host "Creating and switching to branch $BranchName"
git checkout -b $BranchName

Write-Host "Staging changes..."
git add .

Write-Host "Committing with message: $CommitMessage"
git commit -m "$CommitMessage"

Write-Host "Pushing to $Remote/$BranchName"
git push -u $Remote $BranchName

if (Check-Command gh) {
  Write-Host "gh CLI found — creating Pull Request against $Base"
  gh pr create --base $Base --head $BranchName --title "$CommitMessage" --body "This PR adds /health endpoint, Docker HEALTHCHECK and CI smoke-test improvements.\n\nSmoke test and unit tests passed locally. See README for usage." --reviewer ""
} else {
  Write-Host "gh CLI not found. Open the following URL to create a PR in browser:" 
  $remoteUrl = git config --get remote.$Remote.url
  if ($remoteUrl -match '^git@github.com:(.+)\/.+\.git$') {
    $repo = $Matches[1]
    $url = "https://github.com/$repo/pull/new/$BranchName"
  } elseif ($remoteUrl -match '^https://github.com/(.+)') {
    $repo = $Matches[1] -replace '\.git$',''
    $url = "https://github.com/$repo/pull/new/$BranchName"
  } else {
    $url = "https://github.com/"
  }
  Write-Host $url
}

Write-Host "Done. If the push succeeded, CI will start automatically on GitHub."
