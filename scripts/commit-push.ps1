<#
.SYNOPSIS
    Stage everything, commit with the given message, and push the current branch.

.DESCRIPTION
    Closes out one roadmap.md iteration: shows `git status`, stages all changes
    (tracked + untracked), commits with -Message, then pushes the current branch
    to origin (skip with -NoPush to just commit).

.EXAMPLE
    ./scripts/commit-push.ps1 -Message "docs: bootstrap docs/ scaffold and commit-push script"

.EXAMPLE
    ./scripts/commit-push.ps1 -Message "docs: translate spec to English and add frontend architecture doc" -NoPush
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [switch]$NoPush
)

$ErrorActionPreference = 'Stop'

Write-Host "`n== git status (before) ==" -ForegroundColor Cyan
git status

git add -A

Write-Host "`n== staged for commit ==" -ForegroundColor Cyan
git status --short

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "`nNothing staged — working tree matches HEAD, nothing to commit." -ForegroundColor Yellow
    exit 0
}

git commit -m $Message

if ($NoPush) {
    Write-Host "`n-NoPush set — commit created locally, not pushed." -ForegroundColor Yellow
    exit 0
}

$branch = git branch --show-current
Write-Host "`n== pushing '$branch' to origin ==" -ForegroundColor Cyan
git push origin $branch
