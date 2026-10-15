# Gracie Studio - local server (gracie-studyo.bat starts it, the browser opens tools/studio.html)
# Serves the project at http://localhost:<port>/ and saves what the editors change:
#   /api/dialog       js/amor/data/custom-dialog.js   (dialog editor: words, replies, scenarios - the Amor engine)
#   /api/bot-rules    js/data/bot-rules.js            (bot rules and add-ons)
#   /api/people-defs  js/data/people-defs.js          (names, personality, job... of the characters)
#   /api/photos...    fotograflar\<folder>\           (add / delete photos, profile photo, new character)
#   /api/build-people runs tools/build-people.ps1     (resized copies in people\ + js/data/people.js)
# Every save bumps the sw.js version so phones get the new files. Only reachable from this computer.
# (ASCII only, for Windows PowerShell 5.1.)

param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$photos = Join-Path $root 'fotograflar'
$swFile = Join-Path $root 'sw.js'
$utf8 = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName Microsoft.VisualBasic

$MIME = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'; '.gif' = 'image/gif'; '.bmp' = 'image/bmp'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.md' = 'text/plain; charset=utf-8'
}
$IMG = '^\.(jpe?g|png|gif|bmp)$'

function Send($ctx, [int]$code, [string]$type, [byte[]]$bytes) {
  $res = $ctx.Response
  $res.StatusCode = $code
  $res.ContentType = $type
  $res.Headers['Cache-Control'] = 'no-store'
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.OutputStream.Close()
}
function SendJson($ctx, [int]$code, [string]$json) { Send $ctx $code 'application/json; charset=utf-8' $utf8.GetBytes($json) }
function JStr([string]$s) { return (ConvertTo-Json $s) }
function Body($ctx) { $r = New-Object IO.StreamReader($ctx.Request.InputStream, $utf8); $b = $r.ReadToEnd(); $r.Close(); return $b }
function Fail($ctx, [string]$msg) { SendJson $ctx 400 ('{"ok":false,"error":' + (JStr $msg) + '}') }

function BumpSw {
  $sw = [IO.File]::ReadAllText($swFile, $utf8)
  $m = [regex]::Match($sw, 'VERSION = "gracie-v(\d+)"')
  if (-not $m.Success) { return '' }
  $next = 'gracie-v' + ([int]$m.Groups[1].Value + 1)
  [IO.File]::WriteAllText($swFile, $sw.Replace($m.Value, 'VERSION = "' + $next + '"'), $utf8)
  return $next
}

# ---- a JS data file that is "<header> <Name> = <json>;" ----
function ReadJsData([string]$file, [string]$name, [string]$empty) {
  if (-not (Test-Path $file)) { return $empty }
  $m = [regex]::Match([IO.File]::ReadAllText($file, $utf8), '(?s)' + [regex]::Escape($name) + '\s*=\s*(.*?);\s*$')
  if ($m.Success) { return $m.Groups[1].Value }
  return $empty
}
function SaveJsData($ctx, [string]$file, [string]$header, [string]$ns, [string]$name, [string]$check) {
  $body = Body $ctx
  try { $obj = $body | ConvertFrom-Json } catch { Fail $ctx 'invalid JSON'; return }
  if ($check -and $null -eq $obj.$check) { Fail $ctx "$check missing"; return }
  if ((ReadJsData $file $name '').Trim() -eq $body.Trim()) { SendJson $ctx 200 '{"ok":true,"changed":false}'; return }
  [IO.File]::WriteAllText($file, "$header`nwindow.$ns = window.$ns || {};`n$name = $body;`n", $utf8)
  $ver = BumpSw
  Write-Host ('  saved  ' + [IO.Path]::GetFileName($file) + '  ' + (Get-Date -Format 'HH:mm:ss') + "  (sw: $ver)") -ForegroundColor Green
  SendJson $ctx 200 ('{"ok":true,"changed":true,"sw":"' + $ver + '"}')
}

# ---- people-defs.js: two objects (defs + extra jobs) ----
$defsFile = Join-Path $root 'js\data\people-defs.js'
function SavePeopleDefs($ctx) {
  $body = Body $ctx
  try { $obj = $body | ConvertFrom-Json } catch { Fail $ctx 'invalid JSON'; return }
  if ($null -eq $obj.defs -or $null -eq $obj.jobs) { Fail $ctx 'defs/jobs missing'; return }
  try { $null = $obj.defs | ConvertFrom-Json; $null = $obj.jobs | ConvertFrom-Json } catch { Fail $ctx 'invalid defs/jobs JSON'; return }
  $header = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'people-defs-header.txt'), $utf8)
  $content = $header + "window.Gracie = window.Gracie || {};`n`nGracie.PEOPLE_DEFS = " + $obj.defs + ";`n`nGracie.EXTRA_JOBS = " + $obj.jobs + ";`n"
  [IO.File]::WriteAllText($defsFile, $content, $utf8)
  $ver = BumpSw
  Write-Host ('  saved  people-defs.js  ' + (Get-Date -Format 'HH:mm:ss') + "  (sw: $ver)") -ForegroundColor Green
  SendJson $ctx 200 ('{"ok":true,"sw":"' + $ver + '"}')
}

# ---- photos: fotograflar\<folder>\ ----
function Slug([string]$s) {
  $s = $s.Replace([string][char]0x0130, 'i').ToLowerInvariant()
  $pairs = @(@([char]0x00E7, 'c'), @([char]0x011F, 'g'), @([char]0x0131, 'i'), @([char]0x00F6, 'o'), @([char]0x015F, 's'), @([char]0x00FC, 'u'),
    @([char]0x00E2, 'a'), @([char]0x00EE, 'i'), @([char]0x00FB, 'u'), @([char]0x00EB, 'e'), @([char]0x00E9, 'e'), @([char]0x00E8, 'e'),
    @([char]0x00E1, 'a'), @([char]0x00E0, 'a'), @([char]0x00EF, 'i'), @([char]0x00F4, 'o'))
  foreach ($p in $pairs) { $s = $s.Replace([string]$p[0], [string]$p[1]) }
  return ($s -replace '[^a-z0-9_-]+', '-').Trim('-')
}
function SafeName([string]$n) { return ($n -replace '[\\/:*?"<>|]', '_').Trim().TrimStart('.') }
function FolderPath([string]$folder) {
  $f = SafeName $folder
  if (-not $f) { return $null }
  $full = [IO.Path]::GetFullPath((Join-Path $photos $f))
  if (-not $full.StartsWith($photos, [StringComparison]::OrdinalIgnoreCase)) { return $null }
  return $full
}
function ListPhotos($ctx) {
  if (-not (Test-Path $photos)) { New-Item -ItemType Directory -Force $photos | Out-Null }
  $items = foreach ($d in Get-ChildItem $photos -Directory | Sort-Object Name) {
    $files = @(Get-ChildItem $d.FullName -File | Where-Object { $_.Extension -match $IMG } | Sort-Object Name | ForEach-Object { $_.Name })
    $bad = @(Get-ChildItem $d.FullName -File | Where-Object { $_.Extension -match '^\.(webp|heic|heif|avif)$' } | ForEach-Object { $_.Name })
    '{"folder":' + (JStr $d.Name) + ',"id":' + (JStr (Slug $d.Name)) + ',"files":' + (ConvertTo-Json @($files) -Compress) + ',"unreadable":' + (ConvertTo-Json @($bad) -Compress) + '}'
  }
  SendJson $ctx 200 ('{"folders":[' + ($items -join ',') + ']}')
}
function Query($ctx) {
  # HttpListener's QueryString decodes with the system code page: read the raw query as UTF-8 instead
  $q = @{}
  foreach ($part in $ctx.Request.Url.Query.TrimStart('?').Split('&')) {
    if (-not $part) { continue }
    $kv = $part.Split('=', 2)
    $q[[Uri]::UnescapeDataString($kv[0].Replace('+', ' '))] = if ($kv.Count -gt 1) { [Uri]::UnescapeDataString($kv[1].Replace('+', ' ')) } else { '' }
  }
  return $q
}
function Upload($ctx) {
  $q = Query $ctx
  $dir = FolderPath $q['folder']; $name = SafeName $q['name']
  if (-not $dir -or -not $name -or [IO.Path]::GetExtension($name) -notmatch '^\.(jpe?g|png|gif|bmp|webp|heic)$') { Fail $ctx 'bad folder or file'; return }
  New-Item -ItemType Directory -Force $dir | Out-Null
  $base = [IO.Path]::GetFileNameWithoutExtension($name); $ext = [IO.Path]::GetExtension($name).ToLower(); $target = Join-Path $dir "$base$ext"; $k = 2
  while (Test-Path -LiteralPath $target) { $target = Join-Path $dir "$base-$k$ext"; $k++ }
  $fs = [IO.File]::Create($target)
  try { $ctx.Request.InputStream.CopyTo($fs) } finally { $fs.Close() }
  Write-Host ('  photo  ' + $q['folder'] + '\' + [IO.Path]::GetFileName($target)) -ForegroundColor Cyan
  SendJson $ctx 200 ('{"ok":true,"name":' + (JStr ([IO.Path]::GetFileName($target))) + '}')
}
function PhotoAction($ctx, [string]$action) {
  try { $obj = (Body $ctx) | ConvertFrom-Json } catch { Fail $ctx 'invalid JSON'; return }
  $dir = FolderPath $obj.folder
  if (-not $dir) { Fail $ctx 'bad folder'; return }
  if ($action -eq 'new-person') {
    if (Test-Path $dir) { Fail $ctx 'Bu adla bir klasor zaten var'; return }
    New-Item -ItemType Directory -Force $dir | Out-Null
    SendJson $ctx 200 ('{"ok":true,"folder":' + (JStr ([IO.Path]::GetFileName($dir))) + ',"id":' + (JStr (Slug ([IO.Path]::GetFileName($dir)))) + '}'); return
  }
  if ($action -eq 'open-folder') { Start-Process explorer.exe $(if (Test-Path $dir) { $dir } else { $photos }); SendJson $ctx 200 '{"ok":true}'; return }
  $file = Join-Path $dir (SafeName $obj.name)
  if (-not (Test-Path -LiteralPath $file)) { Fail $ctx 'no such photo'; return }
  if ($action -eq 'delete-photo') {
    # to the Recycle Bin, so a wrong click can be undone
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($file, 'OnlyErrorDialogs', 'SendToRecycleBin')
    SendJson $ctx 200 '{"ok":true}'; return
  }
  if ($action -eq 'set-profile') {
    # the old profile photo becomes a normal post (eski-profil.jpg), the chosen one becomes profil.<ext>
    foreach ($old in @(Get-ChildItem $dir -File | Where-Object { $_.BaseName -match '^(profil|profile)$' })) {
      if ($old.FullName -eq (Get-Item -LiteralPath $file).FullName) { SendJson $ctx 200 '{"ok":true}'; return }
      $t = Join-Path $dir ('eski-profil' + $old.Extension); $k = 2
      while (Test-Path -LiteralPath $t) { $t = Join-Path $dir ("eski-profil-$k" + $old.Extension); $k++ }
      Move-Item -LiteralPath $old.FullName $t
    }
    Move-Item -LiteralPath $file (Join-Path $dir ('profil' + [IO.Path]::GetExtension($file).ToLower()))
    SendJson $ctx 200 '{"ok":true}'; return
  }
  Fail $ctx 'unknown action'
}
function BuildPeople($ctx) {
  Write-Host '  building photos...' -ForegroundColor Cyan
  $log = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build-people.ps1') 2>&1 | Out-String
  Write-Host $log
  SendJson $ctx 200 ('{"ok":true,"log":' + (JStr $log) + '}')
}

function ServeFile($ctx, [string]$path) {
  if ($path -eq '/') { $path = '/tools/studio.html' }
  $full = [IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart('/') -replace '/', '\')))
  if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
    SendJson $ctx 404 '{"error":"not found"}'; return
  }
  $type = $MIME[[IO.Path]::GetExtension($full).ToLower()]
  if (-not $type) { $type = 'application/octet-stream' }
  Send $ctx 200 $type ([IO.File]::ReadAllBytes($full))
}

$dialogFile = Join-Path $root 'js\amor\data\custom-dialog.js'
$rulesFile = Join-Path $root 'js\data\bot-rules.js'

$listener = $null
foreach ($p in 8765..8785) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch { }
}
if (-not $listener) { Write-Host 'No free port (8765-8785).' -ForegroundColor Red; exit 1 }
$studio = "http://localhost:$port/tools/studio.html"
Write-Host ''
Write-Host '  Gracie Studio' -ForegroundColor Cyan
Write-Host "  Studio:  $studio"
Write-Host "  App:     http://localhost:$port/index.html"
Write-Host '  Close this window (or Ctrl+C) to stop.'
Write-Host ''
if (-not $NoBrowser) { Start-Process $studio }

try {
  while ($listener.IsListening) {
    $task = $listener.GetContextAsync()
    while (-not $task.AsyncWaitHandle.WaitOne(300)) { }
    $ctx = $task.GetAwaiter().GetResult()
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      $method = $ctx.Request.HttpMethod
      switch -Regex ("$method $path") {
        '^GET /api/dialog$' { SendJson $ctx 200 (ReadJsData $dialogFile 'Amor.CUSTOM_DIALOG' '{"intents":{},"lines":{}}'); break }
        '^POST /api/dialog$' { SaveJsData $ctx $dialogFile '/* gracie-studyo.bat > Diyalog editoru ile duzenlenir (tools/dialog-editor.html) */' 'Amor' 'Amor.CUSTOM_DIALOG' 'intents'; break }
        '^GET /api/bot-rules$' { SendJson $ctx 200 (ReadJsData $rulesFile 'Stories.BOT_RULES' '{"rules":[]}'); break }
        '^POST /api/bot-rules$' { SaveJsData $ctx $rulesFile "/* gracie-studyo.bat > Bot kurallari ile duzenlenir (tools/bot-editor.html). Bicim: js/amor/bot.js'in basindaki aciklama. */" 'Stories' 'Stories.BOT_RULES' 'rules'; break }
        '^POST /api/people-defs$' { SavePeopleDefs $ctx; break }
        '^GET /api/photos$' { ListPhotos $ctx; break }
        '^POST /api/photos/upload$' { Upload $ctx; break }
        '^POST /api/photos/(new-person|open-folder|delete-photo|set-profile)$' { PhotoAction $ctx $Matches[1]; break }
        '^POST /api/build-people$' { BuildPeople $ctx; break }
        '^GET ' { ServeFile $ctx $path; break }
        default { SendJson $ctx 405 '{"error":"not supported"}' }
      }
    } catch {
      Write-Host ('  error: ' + $_.Exception.Message) -ForegroundColor Red
      try { SendJson $ctx 500 ('{"ok":false,"error":' + (JStr $_.Exception.Message) + '}') } catch { }
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
