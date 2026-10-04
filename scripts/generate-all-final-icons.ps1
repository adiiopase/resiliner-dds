Add-Type -AssemblyName System.Drawing

$projectRoot = Resolve-Path "."
$pubImages = Join-Path $projectRoot "public\images"
$pwaIconsDir = Join-Path $projectRoot "public\icons"
$androidRes = Join-Path $projectRoot "android-app\app\src\main\res"
$drawableDir = Join-Path $androidRes "drawable"
$drawableNodpiDir = Join-Path $androidRes "drawable-nodpi"
$anydpiDir = Join-Path $androidRes "mipmap-anydpi-v26"

if (-not (Test-Path $pwaIconsDir)) { New-Item -ItemType Directory -Path $pwaIconsDir -Force | Out-Null }
if (-not (Test-Path $drawableDir)) { New-Item -ItemType Directory -Path $drawableDir -Force | Out-Null }
if (-not (Test-Path $drawableNodpiDir)) { New-Item -ItemType Directory -Path $drawableNodpiDir -Force | Out-Null }
if (-not (Test-Path $anydpiDir)) { New-Item -ItemType Directory -Path $anydpiDir -Force | Out-Null }

$srcImg = [System.Drawing.Bitmap]::FromFile((Join-Path $pubImages "logo-digitaldocs.png"))

# 1. Clean horizontal full logo
$logoX = 320
$logoY = 380
$logoW = 810
$logoH = 180

$cropLogo = New-Object System.Drawing.Bitmap($logoW, $logoH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gLogo = [System.Drawing.Graphics]::FromImage($cropLogo)
$gLogo.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gLogo.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gLogo.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gLogo.DrawImage($srcImg, (New-Object System.Drawing.Rectangle(0, 0, $logoW, $logoH)), $logoX, $logoY, $logoW, $logoH, [System.Drawing.GraphicsUnit]::Pixel)
$gLogo.Dispose()

$cropLogo.Save((Join-Path $pubImages "logo-digitaldocs-clean.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$cropLogo.Save((Join-Path $drawableDir "logo_digitaldocs.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$cropLogo.Save((Join-Path $drawableNodpiDir "logo_digitaldocs.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Extract emblem & text for stacked icon
$embX = 320
$embY = 380
$embW = 275
$embH = 180
$cropEmb = New-Object System.Drawing.Bitmap($embW, $embH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gEmb = [System.Drawing.Graphics]::FromImage($cropEmb)
$gEmb.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gEmb.DrawImage($srcImg, (New-Object System.Drawing.Rectangle(0, 0, $embW, $embH)), $embX, $embY, $embW, $embH, [System.Drawing.GraphicsUnit]::Pixel)
$gEmb.Dispose()

$textX = 590
$textY = 415
$textW = 530
$textH = 135
$cropText = New-Object System.Drawing.Bitmap($textW, $textH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gText = [System.Drawing.Graphics]::FromImage($cropText)
$gText.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gText.DrawImage($srcImg, (New-Object System.Drawing.Rectangle(0, 0, $textW, $textH)), $textX, $textY, $textW, $textH, [System.Drawing.GraphicsUnit]::Pixel)
$gText.Dispose()

# Master 1024x1024 master app icon
$masterIcon = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gMaster = [System.Drawing.Graphics]::FromImage($masterIcon)
$gMaster.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMaster.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gMaster.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gMaster.Clear([System.Drawing.Color]::Transparent)

# Draw Emblem on master
$masterEmbW = 560
$masterEmbH = [int](560 / ($cropEmb.Width / $cropEmb.Height))
$masterEmbX = [int]((1024 - $masterEmbW) / 2)
$masterEmbY = 110
$gMaster.DrawImage($cropEmb, (New-Object System.Drawing.Rectangle($masterEmbX, $masterEmbY, $masterEmbW, $masterEmbH)))

# Draw Text on master
$masterTextW = 820
$masterTextH = [int](820 / ($cropText.Width / $cropText.Height))
$masterTextX = [int]((1024 - $masterTextW) / 2)
$masterTextY = $masterEmbY + $masterEmbH + 40
$gMaster.DrawImage($cropText, (New-Object System.Drawing.Rectangle($masterTextX, $masterTextY, $masterTextW, $masterTextH)))
$gMaster.Dispose()

function Render-SquareIcon([int]$targetSize, [string]$outputPath, [float]$paddingRatio = 0.08, [bool]$isRound = $false, [bool]$transparentBg = $false) {
    $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    if (-not $transparentBg) {
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        if ($isRound) {
            $g.FillEllipse($bgBrush, 0, 0, $targetSize, $targetSize)
        } else {
            $g.FillRectangle($bgBrush, 0, 0, $targetSize, $targetSize)
        }
        $bgBrush.Dispose()
    }

    $innerSize = [int]($targetSize * (1.0 - (2.0 * $paddingRatio)))
    $destX = [int](($targetSize - $innerSize) / 2)
    $destY = [int](($targetSize - $innerSize) / 2)

    $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $innerSize, $innerSize)
    $g.DrawImage($masterIcon, $destRect)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $outputPath ($targetSize x $targetSize)"
}

# 1. Generate PWA Icons
Render-SquareIcon 192 (Join-Path $pwaIconsDir "icon-192x192.png") 0.08 $false
Render-SquareIcon 512 (Join-Path $pwaIconsDir "icon-512x512.png") 0.08 $false
Render-SquareIcon 512 (Join-Path $pwaIconsDir "icon-maskable-512x512.png") 0.16 $false
Render-SquareIcon 180 (Join-Path $projectRoot "public\apple-touch-icon.png") 0.08 $false
Render-SquareIcon 180 (Join-Path $pwaIconsDir "apple-touch-icon.png") 0.08 $false

# 2. Generate Android Mipmaps
$sizes = @(
    @{ Name = "mipmap-mdpi"; Size = 48 },
    @{ Name = "mipmap-hdpi"; Size = 72 },
    @{ Name = "mipmap-xhdpi"; Size = 96 },
    @{ Name = "mipmap-xxhdpi"; Size = 144 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192 }
)

foreach ($m in $sizes) {
    $dir = Join-Path $androidRes $m.Name
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Render-SquareIcon $m.Size (Join-Path $dir "ic_launcher.png") 0.06 $false
    Render-SquareIcon $m.Size (Join-Path $dir "ic_launcher_round.png") 0.06 $true
}

# 3. Generate Android Adaptive Foreground (432x432, transparent background, safe zone inside)
Render-SquareIcon 432 (Join-Path $drawableDir "ic_launcher_foreground.png") 0.22 $false $true

$cropLogo.Dispose()
$cropEmb.Dispose()
$cropText.Dispose()
$masterIcon.Dispose()
$srcImg.Dispose()

Write-Host "=== All Master Digital Docs Icons Generated Successfully ==="
