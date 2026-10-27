$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$releaseDirectory = Join-Path $projectDirectory 'release'
New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
$stagingDirectory = Join-Path $releaseDirectory ('cpanel-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stagingDirectory | Out-Null
Copy-Item -LiteralPath (Join-Path $projectDirectory 'dist') -Destination $stagingDirectory -Recurse
Copy-Item -LiteralPath (Join-Path $projectDirectory 'server') -Destination $stagingDirectory -Recurse
foreach ($name in @('app.js', 'package.json', 'DEPLOY.md')) {
    Copy-Item -LiteralPath (Join-Path $projectDirectory "deploy/cpanel/$name") -Destination $stagingDirectory
}
$archivePath = Join-Path $releaseDirectory 'A11yease-cPanel.zip'
Compress-Archive -Path (Join-Path $stagingDirectory '*') -DestinationPath $archivePath -Force
# Delete only this verified, generated staging directory.
$resolvedStaging = [IO.Path]::GetFullPath($stagingDirectory)
$resolvedRelease = [IO.Path]::GetFullPath($releaseDirectory) + [IO.Path]::DirectorySeparatorChar
if (!$resolvedStaging.StartsWith($resolvedRelease, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected staging path' }
Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
Write-Output "cPanel package: $archivePath"
