Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
$imgRoot = Join-Path $root "assets\img"
$maxDim = 900
$quality = 78L

function Resize-ToJpegBase64 {
    param([string]$path, [int]$maxDim, [long]$quality)

    $orig = [System.Drawing.Image]::FromFile($path)
    try {
        $w = $orig.Width
        $h = $orig.Height
        $scale = [Math]::Min(1.0, $maxDim / [Math]::Max($w, $h))
        $newW = [Math]::Max(1, [int]($w * $scale))
        $newH = [Math]::Max(1, [int]($h * $scale))

        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $bmp.SetResolution($orig.HorizontalResolution, $orig.VerticalResolution)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        # flatten transparency onto white since source PNGs may have alpha
        $g.Clear([System.Drawing.Color]::White)
        $g.DrawImage($orig, 0, 0, $newW, $newH)
        $g.Dispose()

        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)

        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, $jpegCodec, $encParams)
        $bytes = $ms.ToArray()
        $ms.Dispose()
        $bmp.Dispose()

        return [Convert]::ToBase64String($bytes)
    } finally {
        $orig.Dispose()
    }
}

$map = [ordered]@{}
$collections = @("handoff-2026", "candle", "proseries")
foreach ($col in $collections) {
    $dir = Join-Path $imgRoot $col
    Get-ChildItem $dir -File | ForEach-Object {
        $key = "$col/$($_.Name)"
        Write-Host "Encoding $key ..."
        $b64 = Resize-ToJpegBase64 -path $_.FullName -maxDim $maxDim -quality $quality
        $map[$key] = "data:image/jpeg;base64,$b64"
    }
}

$heroPath = Join-Path $imgRoot "hero\hero-aisle.jpg"
Write-Host "Encoding hero image ..."
$heroB64 = Resize-ToJpegBase64 -path $heroPath -maxDim 1400 -quality 76
$map["__hero__"] = "data:image/jpeg;base64,$heroB64"

$outFile = Join-Path $root "assets\js\data-uris.generated.js"
$sw = New-Object System.IO.StreamWriter($outFile, $false, [System.Text.Encoding]::UTF8)
$sw.WriteLine("// GENERATED FILE - compressed data-URI image map for the shareable single-file bundle.")
$sw.Write("const DATA_URIS = ")
$sw.Write(($map | ConvertTo-Json -Depth 3 -Compress))
$sw.WriteLine(";")
$sw.Close()

$totalBytes = (Get-Item $outFile).Length
Write-Host "Done. Wrote $outFile ($([Math]::Round($totalBytes/1MB,2)) MB)"
