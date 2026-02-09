param(
  [string]$ProjectLogPath = "PROJECT_LOG.md",
  [string]$ArchivePath = "docs/logs/PROJECT_LOG_ARCHIVE.md",
  [int]$SummaryBulletLimit = 2,
  [int]$SummaryCharLimit = 140
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-Entries {
  param([string]$RawContent)

  return [regex]::Matches(
    $RawContent,
    "(?ms)^- \*\*Date:\*\*.*?(?=^\s*---\s*$|\z)"
  ) | ForEach-Object { $_.Value.Trim() }
}

function Get-Field {
  param(
    [string]$Entry,
    [string]$Field
  )

  $match = [regex]::Match(
    $Entry,
    "^- \*\*$([regex]::Escape($Field)):\*\*\s*(.+)$",
    [System.Text.RegularExpressions.RegexOptions]::Multiline
  )
  if ($match.Success) {
    return $match.Groups[1].Value.Trim()
  }

  return ""
}

function Sanitize-CompactText {
  param(
    [string]$Value,
    [int]$CharLimit
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  $ascii = [regex]::Replace($Value, "[^\u0020-\u007E]", " ")
  $singleLine = [regex]::Replace($ascii, "\s+", " ").Trim()
  if ($singleLine.Length -gt $CharLimit) {
    return $singleLine.Substring(0, $CharLimit).TrimEnd() + "..."
  }

  return $singleLine
}

function Get-CompactSummaryBullets {
  param(
    [string]$Entry,
    [int]$BulletLimit,
    [int]$CharLimit
  )

  $summaryMatch = [regex]::Match(
    $Entry,
    "(?ms)^- \*\*Summary:\*\*\s*(.*?)(?=^- \*\*(?:Date|Task|Summary|Files changed|Commands run|How to verify|Notes/TODO|Verification):\*\*|\z)"
  )

  if (-not $summaryMatch.Success) {
    return @("No summary provided.")
  }

  $summaryBody = $summaryMatch.Groups[1].Value
  $rawLines = $summaryBody -split "\r?\n"
  $bullets = New-Object System.Collections.Generic.List[string]

  foreach ($line in $rawLines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      continue
    }

    if ($trimmed.StartsWith("-")) {
      $trimmed = $trimmed.TrimStart("-").Trim()
    }

    $sanitized = Sanitize-CompactText -Value $trimmed -CharLimit $CharLimit
    if ([string]::IsNullOrWhiteSpace($sanitized)) {
      continue
    }

    if (-not $bullets.Contains($sanitized)) {
      $bullets.Add($sanitized)
    }

    if ($bullets.Count -ge $BulletLimit) {
      break
    }
  }

  if ($bullets.Count -eq 0) {
    return @("No summary provided.")
  }

  return $bullets.ToArray()
}

function Convert-ToCompactEntry {
  param(
    [string]$Entry,
    [int]$BulletLimit,
    [int]$CharLimit
  )

  $date = Get-Field -Entry $Entry -Field "Date"
  $task = Get-Field -Entry $Entry -Field "Task"
  $date = Sanitize-CompactText -Value $date -CharLimit 48
  $task = Sanitize-CompactText -Value $task -CharLimit 100

  if ([string]::IsNullOrWhiteSpace($date)) {
    $date = "Unknown date"
  }
  if ([string]::IsNullOrWhiteSpace($task)) {
    $task = "Untitled task"
  }

  $summaryBullets = Get-CompactSummaryBullets -Entry $Entry -BulletLimit $BulletLimit -CharLimit $CharLimit

  $output = New-Object System.Collections.Generic.List[string]
  $output.Add("- **Date:** $date")
  $output.Add("- **Task:** $task")
  $output.Add("- **Summary:**")

  foreach ($bullet in $summaryBullets) {
    $output.Add("  - $bullet")
  }

  return ($output -join "`r`n")
}

function Write-Utf8NoBomFile {
  param(
    [string]$Path,
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Rewrite-LogFile {
  param(
    [string]$Path,
    [string]$Heading,
    [string[]]$CompactEntries
  )

  $body = if ($CompactEntries.Count -gt 0) {
    $CompactEntries -join "`r`n`r`n---`r`n`r`n"
  } else {
    ""
  }

  $content = if ([string]::IsNullOrWhiteSpace($body)) {
    "# $Heading`r`n"
  } else {
    "# $Heading`r`n`r`n$body`r`n"
  }

  Write-Utf8NoBomFile -Path $Path -Content $content
}

$projectRaw = Get-Content -Raw -Path $ProjectLogPath
$archiveRaw = Get-Content -Raw -Path $ArchivePath

$projectEntries = Get-Entries -RawContent $projectRaw
$archiveEntries = Get-Entries -RawContent $archiveRaw

$compactProject = $projectEntries | ForEach-Object {
  Convert-ToCompactEntry -Entry $_ -BulletLimit $SummaryBulletLimit -CharLimit $SummaryCharLimit
}
$compactArchive = $archiveEntries | ForEach-Object {
  Convert-ToCompactEntry -Entry $_ -BulletLimit $SummaryBulletLimit -CharLimit $SummaryCharLimit
}

Rewrite-LogFile -Path $ProjectLogPath -Heading "PROJECT_LOG.md" -CompactEntries $compactProject
Rewrite-LogFile -Path $ArchivePath -Heading "PROJECT_LOG archive (compact)" -CompactEntries $compactArchive

$projectSize = (Get-Item $ProjectLogPath).Length
$archiveSize = (Get-Item $ArchivePath).Length
Write-Output ("PROJECT_LOG.md compacted to {0} bytes" -f $projectSize)
Write-Output ("PROJECT_LOG_ARCHIVE.md compacted to {0} bytes" -f $archiveSize)
