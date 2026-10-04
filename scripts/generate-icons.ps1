Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\public\images\logo-digitaldocs.png"
$iconsDir = Join-Path $PSScriptRoot "..\public\icons"

if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

$sourceImg = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))

function Create-AppIcon([int]$targetSize, [string]$outputPath, [bool]$maskable = $false) {
    $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0B1120")
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($brush, 0, 0, $targetSize, $targetSize)
    $brush.Dispose()

    # Calculate padded rect for logo inside icon
    $paddingRatio = if ($maskable) { 0.25 } else { 0.12 }
    $innerSize = [int]($targetSize * (1.0 - (2.0 * $paddingRatio)))
    
    # Preserve aspect ratio of source
    $srcRatio = $sourceImg.Width / $sourceImg.Height
    if ($srcRatio -ge 1.0) {
        $destWidth = $innerSize
        $destHeight = [int]($innerSize / $srcRatio)
    } else {
        $destHeight = $innerSize
        $destWidth = [int]($innerSize * $srcRatio)
    }
    
    $destX = [int](($targetSize - $destWidth) / 2)
    $destY = [int](($targetSize - $destHeight) / 2)

    $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $destWidth, $destHeight)
    $g.DrawImage($sourceImg, $destRect)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created icon: $outputPath ($targetSize x $targetSize)"
}

Create-AppIcon 192 (Join-Path $iconsDir "icon-192x192.png") $false
Create-AppIcon 512 (Join-Path $iconsDir "icon-512x512.png") $false
Create-AppIcon 512 (Join-Path $iconsDir "icon-maskable-512x512.png") $true
Create-AppIcon 180 (Join-Path $PSScriptRoot "..\public\apple-touch-icon.png") $false
Create-AppIcon 180 (Join-Path $iconsDir "apple-touch-icon.png") $false

$sourceImg.Dispose()
Write-Host "All PWA icons generated successfully!"
