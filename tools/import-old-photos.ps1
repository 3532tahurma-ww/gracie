<#
  Gracie - eski uygulamaların fotoğraflarını fotograflar\ klasörüne aktarır (bir kere yeterli; tekrar çalıştırılırsa
  sadece fotograflar\ içinde olmayan karakterleri ekler, var olanlara dokunmaz).
    Amor        -> ..\Amor\characters\<set>\        => fotograflar\a-<set>\
    Don't Stop  -> ..\Amor Stories\mods\dontstop\   => fotograflar\ds-<ad>\   (portreler sahne arka planına yerleştirilir)
    Carmen      -> ..\Amor Stories\mods\carmen\<ad>\ => fotograflar\carmen-<ad>\
  Orijinallere dokunulmaz, sadece kopyalanır.
#>
param(
  [string]$Amor = (Join-Path $PSScriptRoot '..\..\Amor'),
  [string]$Stories = (Join-Path $PSScriptRoot '..\..\Amor Stories')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$dest = Join-Path $root 'fotograflar'
New-Item -ItemType Directory -Force $dest | Out-Null
$jpeg = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 90L
$slug = { param($s) ($s.ToLowerInvariant() -replace '[^a-z0-9_-]+', '-').Trim('-') }
$added = 0

function Copy-Set($id, $profile, $others) {
  $dir = Join-Path $dest $id
  if (Test-Path $dir) { return }
  New-Item -ItemType Directory -Force $dir | Out-Null
  if ($profile -and (Test-Path -LiteralPath $profile)) { Copy-Item -LiteralPath $profile (Join-Path $dir ('profil' + [IO.Path]::GetExtension($profile).ToLower())) }
  foreach ($f in $others) { if (Test-Path -LiteralPath $f) { Copy-Item -LiteralPath $f (Join-Path $dir ([IO.Path]::GetFileName($f))) } }
  $script:added++
  Write-Host "  + $id"
}

# Amor (js/data/photos.js listesi)
$photosJs = Join-Path $Amor 'js\data\photos.js'
if (Test-Path $photosJs) {
  foreach ($line in [IO.File]::ReadAllLines($photosJs, [Text.Encoding]::UTF8)) {
    $m = [regex]::Match($line, '\{\s*id:\s*"([^"]+)",\s*dir:\s*"([^"]*)",\s*profile:\s*"([^"]*)",\s*photos:\s*\[([^\]]*)\]')
    if (-not $m.Success) { continue }
    $setDir = Join-Path (Join-Path (Join-Path $Amor 'characters') $m.Groups[1].Value) $m.Groups[2].Value
    $others = @([regex]::Matches($m.Groups[4].Value, '"([^"]+)"') | ForEach-Object { Join-Path $setDir $_.Groups[1].Value })
    Copy-Set ('a-' + (& $slug $m.Groups[1].Value)) (Join-Path $setDir $m.Groups[3].Value) $others
  }
}

# Carmen
$cm = Join-Path $Stories 'mods\carmen'
if (Test-Path $cm) {
  foreach ($d in Get-ChildItem $cm -Directory) {
    $all = @(Get-ChildItem $d.FullName -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|gif|bmp)$' })
    if (-not $all.Count) { continue }
    $prof = $all | Where-Object { $_.BaseName -match '^(profile|profil)$' } | Select-Object -First 1
    Copy-Set ('carmen-' + (& $slug $d.Name)) ($(if ($prof) { $prof.FullName } else { $null })) @($all | Where-Object { -not $prof -or $_.FullName -ne $prof.FullName } | ForEach-Object { $_.FullName })
  }
}

# Don't Stop: portre + sahne -> hazır JPG'ler
$ds = Join-Path $Stories 'mods\dontstop'
$scenes = @{ ava = 'office_cabinet_ava'; claire = 'office_claire'; luna = 'house_witches_luna'; roxy = 'room_roxy_read'; chloe = 'hospital_day_chloe';
  scarlett = 'college_cabinet_day_scarlett'; liza = 'park_day_liza'; ash = 'park_ash'; mia = 'livingroom_mia_sitting'; lily = 'park_day_liza' }
function Compose($bgPath, $portraitPath, $file) {
  $W = 960; $H = 1200
  $bmp = New-Object Drawing.Bitmap $W, $H
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'
  $g.Clear([Drawing.Color]::FromArgb(234, 248, 254))
  if (Test-Path -LiteralPath $bgPath) {
    $bg = [Drawing.Image]::FromFile($bgPath)
    $s = [Math]::Max([double]$W / $bg.Width, [double]$H / $bg.Height); $bw = $bg.Width * $s; $bh = $bg.Height * $s
    $g.DrawImage($bg, [single](($W - $bw) / 2), [single](($H - $bh) / 2), [single]$bw, [single]$bh); $bg.Dispose()
  }
  if ($portraitPath) {
    $p = [Drawing.Image]::FromFile($portraitPath)
    $ph = $H * 0.9; $pw = $p.Width * $ph / $p.Height
    $g.DrawImage($p, [single](($W - $pw) / 2), [single]($H - $ph), [single]$pw, [single]$ph); $p.Dispose()
  }
  $g.Dispose(); $bmp.Save($file, $jpeg, $ep); $bmp.Dispose()
}
if (Test-Path $ds) {
  foreach ($key in $scenes.Keys | Sort-Object) {
    $dir = Join-Path $dest "ds-$key"
    if (Test-Path $dir) { continue }
    New-Item -ItemType Directory -Force $dir | Out-Null
    $bg = Join-Path $ds "bg_$($scenes[$key]).jpg"
    $main = Join-Path $ds "portrait_$key.png"
    if (Test-Path -LiteralPath $main) { Compose $bg $main (Join-Path $dir 'profil.jpg') }
    Get-ChildItem $ds -Filter "portrait_${key}_*.png" | ForEach-Object { Compose $bg $_.FullName (Join-Path $dir (($_.BaseName -replace "^portrait_${key}_", '') + '.jpg')) }
    if (Test-Path -LiteralPath $bg) { Copy-Item -LiteralPath $bg (Join-Path $dir 'sahne.jpg') }
    $added++
    Write-Host "  + ds-$key"
  }
}
Write-Host "`n$added karakter klasörü eklendi -> fotograflar\"
