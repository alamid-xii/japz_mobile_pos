$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
$diagrams=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'diagrams.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$warnings=[Collections.Generic.List[string]]::new()
foreach($d in $diagrams){
 $bmp=[Drawing.Bitmap]::new([int]$d.w*2,[int]$d.h*2)
 $g=[Drawing.Graphics]::FromImage($bmp)
 $g.Clear([Drawing.Color]::White); $g.ScaleTransform(2,2)
 $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
 $pen=[Drawing.Pen]::new([Drawing.Color]::Black,1.8)
 foreach($o in $d.ops){
  $x=[single]$o.x;$y=[single]$o.y;$w=[single]$o.w;$h=[single]$o.h
  switch($o.kind){
   'text' {
    if($o.background){$g.FillRectangle([Drawing.Brushes]::White,$x,$y,$w,$h)}
    $fontStyle=if($o.bold){[Drawing.FontStyle]::Bold}else{[Drawing.FontStyle]::Regular}
    if($o.underline){$fontStyle=$fontStyle -bor [Drawing.FontStyle]::Underline}
    $font=[Drawing.Font]::new('Calibri',[single]$o.size,$fontStyle,[Drawing.GraphicsUnit]::Pixel)
    $fmt=[Drawing.StringFormat]::new()
    $fmt.Alignment=if($o.align -eq 'left'){[Drawing.StringAlignment]::Near}else{[Drawing.StringAlignment]::Center}
    $fmt.LineAlignment=[Drawing.StringAlignment]::Center
    $measure=$g.MeasureString([string]$o.s,$font,[int]$w,$fmt)
    if($measure.Height -gt ($h+4)){$warnings.Add("$($d.n): text height $($measure.Height) > $h : $($o.s)")}
    $g.DrawString([string]$o.s,$font,[Drawing.Brushes]::Black,[Drawing.RectangleF]::new($x,$y,$w,$h),$fmt)
    $font.Dispose();$fmt.Dispose()
   }
   'line' {
    $p=[Drawing.Pen]::new([Drawing.Color]::Black,1.8)
    if($o.dash){$p.DashPattern=[single[]]@(5,4)}
    $points=[Drawing.PointF[]]@($o.points | ForEach-Object { [Drawing.PointF]::new([single]$_[0],[single]$_[1]) })
    $g.DrawLines($p,$points)
    if($o.arrow){
     $a=$points[$points.Length-2];$b=$points[$points.Length-1]
     $dx=$b.X-$a.X;$dy=$b.Y-$a.Y;$len=[Math]::Sqrt($dx*$dx+$dy*$dy)
     if($len -gt 0){$ux=$dx/$len;$uy=$dy/$len;$s=11
      $l=[Drawing.PointF]::new($b.X-$s*$ux-5*$uy,$b.Y-$s*$uy+5*$ux)
      $r=[Drawing.PointF]::new($b.X-$s*$ux+5*$uy,$b.Y-$s*$uy-5*$ux)
      if($o.arrow -eq 'filled'){$g.FillPolygon([Drawing.Brushes]::Black,[Drawing.PointF[]]@($l,$b,$r))}
      else{$g.DrawLines($pen,[Drawing.PointF[]]@($l,$b,$r))}
     }
    };$p.Dispose()
   }
   'dot' {
    if($o.final){$g.DrawEllipse($pen,$x-12,$y-12,24,24);$g.FillEllipse([Drawing.Brushes]::Black,$x-7,$y-7,14,14)}
    else{$g.FillEllipse([Drawing.Brushes]::Black,$x-10,$y-10,20,20)}
   }
   'ellipse' {$g.DrawEllipse($pen,$x,$y,$w,$h)}
   'cylinder' {
    $g.DrawEllipse($pen,$x,$y,$w,30);$g.DrawLine($pen,$x,$y+15,$x,$y+$h-15);$g.DrawLine($pen,$x+$w,$y+15,$x+$w,$y+$h-15)
    $g.DrawArc($pen,$x,$y+$h-30,$w,30,0,180)
   }
   'diamond' {$g.DrawPolygon($pen,[Drawing.PointF[]]@([Drawing.PointF]::new($x+$w/2,$y),[Drawing.PointF]::new($x+$w,$y+$h/2),[Drawing.PointF]::new($x+$w/2,$y+$h),[Drawing.PointF]::new($x,$y+$h/2)))}
   'round' {
    $path=[Drawing.Drawing2D.GraphicsPath]::new();$r=20
    $path.AddArc($x,$y,$r,$r,180,90);$path.AddArc($x+$w-$r,$y,$r,$r,270,90)
    $path.AddArc($x+$w-$r,$y+$h-$r,$r,$r,0,90);$path.AddArc($x,$y+$h-$r,$r,$r,90,90)
    $path.CloseFigure();$g.DrawPath($pen,$path);$path.Dispose()
   }
   'node' {
    $g.DrawPolygon($pen,[Drawing.PointF[]]@([Drawing.PointF]::new($x,$y+18),[Drawing.PointF]::new($x+18,$y),[Drawing.PointF]::new($x+$w,$y),[Drawing.PointF]::new($x+$w,$y+$h-18),[Drawing.PointF]::new($x+$w-18,$y+$h),[Drawing.PointF]::new($x,$y+$h)))
    $g.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new($x,$y+18),[Drawing.PointF]::new($x+$w-18,$y+18),[Drawing.PointF]::new($x+$w,$y)))
    $g.DrawLine($pen,$x+$w-18,$y+18,$x+$w-18,$y+$h)
   }
   'package' {$g.DrawRectangle($pen,$x,$y+22,$w,$h-22);$g.DrawRectangle($pen,$x,$y,105,22)}
   'store' {$g.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new($x+$w,$y),[Drawing.PointF]::new($x,$y),[Drawing.PointF]::new($x,$y+$h),[Drawing.PointF]::new($x+$w,$y+$h)));$g.DrawLine($pen,$x+40,$y,$x+40,$y+$h)}
   'note' {$g.DrawPolygon($pen,[Drawing.PointF[]]@([Drawing.PointF]::new($x,$y),[Drawing.PointF]::new($x+$w-18,$y),[Drawing.PointF]::new($x+$w,$y+18),[Drawing.PointF]::new($x+$w,$y+$h),[Drawing.PointF]::new($x,$y+$h)));$g.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new($x+$w-18,$y),[Drawing.PointF]::new($x+$w-18,$y+18),[Drawing.PointF]::new($x+$w,$y+18)))}
   default {$g.DrawRectangle($pen,$x,$y,$w,$h)}
  }
 }
 $path=Join-Path $root ('diagrams\{0:00}.png' -f $d.n);$bmp.Save($path,[Drawing.Imaging.ImageFormat]::Png)
 $pen.Dispose();$g.Dispose();$bmp.Dispose()
}
ConvertTo-Json -InputObject @($warnings) | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'layout-checks.json') -Encoding UTF8
Write-Output "Rendered $($diagrams.Count) diagrams. Text warnings: $($warnings.Count)"
foreach($w in $warnings){Write-Output $w}
