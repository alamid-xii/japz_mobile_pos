param([string]$DocPath,[string]$OutDir)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$word=$null;$doc=$null
try{
 $word=New-Object -ComObject Word.Application;$word.Visible=$false;$word.DisplayAlerts=0
 $doc=$word.Documents.Open($DocPath,$false,$true);$doc.Repaginate()
 $pdf=Join-Path $OutDir 'render.pdf';$doc.ExportAsFixedFormat($pdf,17)
 $pages=$doc.ComputeStatistics(2);Write-Output "Pages: $pages"
 $checks=@()
 for($i=1;$i -le $pages;$i++){
  $range=$doc.GoTo(1,1,$i);$start=$range.Start
  if($i -lt $pages){$next=$doc.GoTo(1,1,($i+1));$end=$next.Start}else{$end=$doc.Content.End}
  $pageRange=$doc.Range($start,$end)
  $checks+=@{page=$i;text=$pageRange.Text;images=$pageRange.InlineShapes.Count}
 }
 $checks | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $OutDir 'page-checks.json') -Encoding UTF8
 # Word's print page objects provide an enhanced metafile of each fully laid-out page.
 $doc.ActiveWindow.View.Type=3
 for($i=1;$i -le $pages;$i++){
  $page=$doc.ActiveWindow.Panes.Item(1).Pages.Item($i)
  [byte[]]$bits=$page.EnhMetaFileBits
  $stream=[IO.MemoryStream]::new($bits,0,$bits.Length)
  $mf=[Drawing.Imaging.Metafile]::new($stream)
  $bmp=[Drawing.Bitmap]::new(1240,1754);$g=[Drawing.Graphics]::FromImage($bmp);$g.Clear([Drawing.Color]::White)
  $g.DrawImage($mf,[Drawing.Rectangle]::new(0,0,1240,1754))
  $bmp.Save((Join-Path $OutDir ('page-{0:00}.png' -f $i)),[Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose();$bmp.Dispose();$mf.Dispose();$stream.Dispose()
 }
 Write-Output "Rendered $pages page images."
}finally{
 if($doc){$doc.Close(0);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc)}
 if($word){try{$word.Quit()}catch{if($_.Exception.Message -notmatch 'RPC server is unavailable'){throw}};[void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)}
}
