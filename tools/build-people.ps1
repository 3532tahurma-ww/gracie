<#
  Gracie - karakter fotoğraflarını hazırlar (kisiler-guncelle.bat ya da Gracie Stüdyo çalıştırır)
  ------------------------------------------------------------------------------------------------
  Kaynak: fotograflar\<klasör>\   (her klasör bir karakter)
    profil.jpg (ya da profil.png ...)  -> profil fotoğrafı; yoksa adı ilk sıradaki dosya
    diğer resimler                     -> gönderiler (jpg, jpeg, png, gif, bmp)
  Çıktı: people\<id>\{full,md,sm}\<ad>.jpg  ve  js\data\people.js
    full: en fazla 1280px · md: 720px (akış, hikaye) · sm: 240px (avatar)
  Sadece değişen klasörler yeniden işlenir; silinen klasörlerin çıktısı silinir.
  Klasör adı karakterin kimliği olur (Türkçe harfler sadeleşir: "Elif Su" -> elif-su).
  Ön ekler grubu belirler: a- Amor · ds- Don't Stop · carmen- Carmen · diğerleri Gracie (yeni karakterlerin).
#>
param([switch]$Force)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root 'fotograflar'
$out = Join-Path $root 'people'
$jpeg = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 84L
$utf8 = New-Object Text.UTF8Encoding $false
if (-not (Test-Path $src)) { New-Item -ItemType Directory -Force $src | Out-Null }
New-Item -ItemType Directory -Force $out | Out-Null

function Slug([string]$s) {
  $s = $s.Replace([string][char]0x0130, 'i').ToLowerInvariant()
  $map = @{ 'ç' = 'c'; 'ğ' = 'g'; 'ı' = 'i'; 'ö' = 'o'; 'ş' = 's'; 'ü' = 'u'; 'â' = 'a'; 'î' = 'i'; 'û' = 'u'; 'ë' = 'e'; 'é' = 'e'; 'è' = 'e'; 'á' = 'a'; 'à' = 'a'; 'ï' = 'i'; 'ô' = 'o' }
  foreach ($k in $map.Keys) { $s = $s.Replace($k, $map[$k]) }
  return ($s -replace '[^a-z0-9_-]+', '-').Trim('-')
}
function Open-Image($path) {
  $img = [Drawing.Image]::FromFile($path)
  if ($img.PropertyIdList -contains 0x0112) {  # telefon fotoğrafları: EXIF yönü
    switch ([BitConverter]::ToUInt16($img.GetPropertyItem(0x0112).Value, 0)) {
      3 { $img.RotateFlip('Rotate180FlipNone') } 6 { $img.RotateFlip('Rotate90FlipNone') } 8 { $img.RotateFlip('Rotate270FlipNone') }
    }
  }
  return $img
}
function Save-Scaled($img, $file, $maxW, $maxH) {
  $s = [Math]::Min(1.0, [Math]::Min([double]$maxW / $img.Width, [double]$maxH / $img.Height))
  $w = [Math]::Max(1, [int]($img.Width * $s)); $h = [Math]::Max(1, [int]($img.Height * $s))
  $bmp = New-Object Drawing.Bitmap $w, $h
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([Drawing.Color]::White)
  $g.DrawImage($img, 0, 0, $w, $h)
  $bmp.Save($file, $jpeg, $ep)
  $g.Dispose(); $bmp.Dispose()
}
function GroupOf([string]$id) {
  if ($id.StartsWith('a-')) { return 'amor' }
  if ($id.StartsWith('ds-')) { return 'dontstop' }
  if ($id.StartsWith('carmen-')) { return 'carmen' }
  return 'gracie'
}

$sets = @(); $changed = 0; $skipped = 0; $seen = @{}
foreach ($d in Get-ChildItem $src -Directory | Sort-Object Name) {
  $id = Slug $d.Name
  if (-not $id -or $seen[$id]) { Write-Host "  atlandı (ad boş ya da aynı): $($d.Name)" -ForegroundColor Yellow; continue }
  $seen[$id] = $true
  $files = @(Get-ChildItem $d.FullName -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|gif|bmp)$' } | Sort-Object Name)
  foreach ($x in @(Get-ChildItem $d.FullName -File | Where-Object { $_.Extension -match '^\.(webp|heic|heif|avif)$' })) {
    Write-Host "  $($d.Name)\$($x.Name): bu biçim okunamıyor, JPG ya da PNG olarak kaydet" -ForegroundColor Yellow
  }
  if (-not $files.Count) { continue }
  $prof = $files | Where-Object { $_.BaseName -match '^(profil|profile)$' } | Select-Object -First 1
  if (-not $prof) { $prof = $files[0] }
  $ordered = @($prof) + @($files | Where-Object { $_.FullName -ne $prof.FullName })
  # stable output names: profil.jpg, then each file's own name (adding a photo never renames the others)
  $names = @(); $used = @{}
  foreach ($f in $ordered) {
    $n = if ($f.FullName -eq $prof.FullName) { 'profil' } else { Slug $f.BaseName }
    if (-not $n -or ($n -eq 'profil' -and $f.FullName -ne $prof.FullName)) { $n = 'foto' }
    $base = $n; $k = 2
    while ($used[$n]) { $n = "$base-$k"; $k++ }
    $used[$n] = $true; $names += "$n.jpg"
  }
  $sig = ($ordered | ForEach-Object { "$($_.Name)|$($_.Length)|$($_.LastWriteTimeUtc.Ticks)" }) -join ';'
  $dir = Join-Path $out $id
  $sigFile = Join-Path $dir '.kaynak'
  $ok = (-not $Force) -and (Test-Path $sigFile) -and ([IO.File]::ReadAllText($sigFile) -eq $sig) -and
        (@($names | Where-Object { -not (Test-Path (Join-Path $dir "sm\$_")) }).Count -eq 0)
  $good = @()
  if ($ok) { $skipped++; $good = $names }
  else {
    if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
    foreach ($sub in 'full', 'md', 'sm') { New-Item -ItemType Directory -Force (Join-Path $dir $sub) | Out-Null }
    for ($i = 0; $i -lt $ordered.Count; $i++) {
      try { $img = Open-Image $ordered[$i].FullName } catch { Write-Host "  okunamadı: $($d.Name)\$($ordered[$i].Name)" -ForegroundColor Yellow; continue }
      Save-Scaled $img (Join-Path $dir "full\$($names[$i])") 1280 1280
      Save-Scaled $img (Join-Path $dir "md\$($names[$i])") 720 1100
      Save-Scaled $img (Join-Path $dir "sm\$($names[$i])") 240 320
      $img.Dispose(); $good += $names[$i]
    }
    [IO.File]::WriteAllText($sigFile, $sig, $utf8)
    $changed++
    Write-Host ("  güncellendi  {0,-28} {1} fotoğraf" -f $id, $good.Count) -ForegroundColor Green
  }
  if ($good.Count) { $sets += [pscustomobject]@{ id = $id; group = (GroupOf $id); files = $good } }
}
# characters whose folder is gone
$removed = 0
foreach ($d in Get-ChildItem $out -Directory) { if (-not $seen[$d.Name]) { Remove-Item $d.FullName -Recurse -Force; $removed++; Write-Host "  kaldırıldı  $($d.Name)" -ForegroundColor DarkYellow } }

$lines = $sets | ForEach-Object { '  { id: "' + $_.id + '", group: "' + $_.group + '", files: [' + (($_.files | ForEach-Object { '"' + $_ + '"' }) -join ', ') + '] }' }
$js = "/* Otomatik üretildi: tools/build-people.ps1 (elle düzenleme). Kaynak: fotograflar\<klasör>\ */`r`n" +
      "window.Gracie = window.Gracie || {};`r`nGracie.SETS = [`r`n" + ($lines -join ",`r`n") + "`r`n];`r`n"
$jsFile = Join-Path $root 'js\data\people.js'
$oldJs = if (Test-Path $jsFile) { [IO.File]::ReadAllText($jsFile) } else { '' }
if ($oldJs -ne $js) { [IO.File]::WriteAllText($jsFile, $js, $utf8) }

# new photos under the same names: phones must drop their cached copies
if ($changed -or $removed) {
  $sw = Join-Path $root 'sw.js'
  $t = [IO.File]::ReadAllText($sw)
  $m = [regex]::Match($t, 'gracie-img-(\d+)')
  if ($m.Success) { [IO.File]::WriteAllText($sw, $t.Replace($m.Value, 'gracie-img-' + ([int]$m.Groups[1].Value + 1)), $utf8) }
}
$size = (Get-ChildItem $out -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
Write-Host ("`n{0} karakter · {1} güncellendi · {2} aynı kaldı · {3} kaldırıldı · people\ {4:N1} MB" -f $sets.Count, $changed, $skipped, $removed, $size)
