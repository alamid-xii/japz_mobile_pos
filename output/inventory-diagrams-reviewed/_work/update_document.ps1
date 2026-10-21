$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root=Split-Path $PSScriptRoot -Parent
$meta=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'diagrams.json') -Raw -Encoding UTF8|ConvertFrom-Json
$reference=Join-Path $PSScriptRoot 'reference.docx'
$final=Join-Path $root 'FAJUTAGANA_17_DIAGRAMS_Updated.docx'
Copy-Item -LiteralPath $reference -Destination $final -Force
$zip=[IO.Compression.ZipFile]::Open($final,[IO.Compression.ZipArchiveMode]::Update)
function ReadPart($name){$reader=[IO.StreamReader]::new($zip.GetEntry($name).Open());try{return $reader.ReadToEnd()}finally{$reader.Dispose()}}
function WritePart($name,$content){$entry=$zip.GetEntry($name);if($entry){$entry.Delete()};$entry=$zip.CreateEntry($name);$writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false));try{$writer.Write($content)}finally{$writer.Dispose()}}
try{
 [xml]$xml=ReadPart 'word/document.xml';[xml]$rels=ReadPart 'word/_rels/document.xml.rels'
 $ns=[Xml.XmlNamespaceManager]::new($xml.NameTable)
 $w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
 $ns.AddNamespace('w',$w);$ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main');$ns.AddNamespace('wp','http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing');$ns.AddNamespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
 $paras=@($xml.SelectNodes('//w:body/w:p',$ns));$figure=0;$report=@()
 for($i=0;$i -lt $paras.Count;$i++){
  $drawing=$paras[$i].SelectSingleNode('.//w:drawing',$ns)
  if(!$drawing){continue};$figure++;$diagram=$meta|Where-Object n -eq $figure
  $blip=$drawing.SelectSingleNode('.//a:blip',$ns);$rid=$blip.GetAttribute('embed','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $target=($rels.Relationships.Relationship|Where-Object Id -eq $rid).Target
  if(!$diagram.preserveImage){$entry=$zip.GetEntry('word/'+$target);$entry.Delete();[void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $root ('images/{0:00}.png' -f $figure)),('word/'+$target))}
  $extent=$drawing.SelectSingleNode('.//wp:extent',$ns);$cx=[long]$extent.GetAttribute('cx');$cy=[long]($cx*$diagram.h/$diagram.w)
  $extent.SetAttribute('cy',[string]$cy);$transform=$drawing.SelectSingleNode('.//a:xfrm/a:ext',$ns);$transform.SetAttribute('cy',[string]$cy)
  $properties=$drawing.SelectSingleNode('.//wp:docPr',$ns);$properties.SetAttribute('descr',$diagram.name+'. '+$diagram.paragraphs[0])
  # Keep each original description paragraph, paragraph properties and first run formatting.
  for($k=0;$k -lt 2;$k++){
   $p=$paras[$i+2+$k];$texts=$p.SelectNodes('.//w:t',$ns)
   if(!$texts.Count){throw ('Missing description paragraph for figure '+$figure)}
   $texts[0].InnerText=[string]$diagram.paragraphs[$k]
   for($j=1;$j -lt $texts.Count;$j++){$texts[$j].InnerText=''}
   foreach($cached in @($p.SelectNodes('.//w:lastRenderedPageBreak',$ns))){[void]$cached.ParentNode.RemoveChild($cached)}
  }
  $report+=@{figure=$figure;media=$target;preservedImage=[bool]$diagram.preserveImage;figureWidthEMU=$cx;figureHeightEMU=$cy;captionPreserved=$true;paragraphFormattingPreserved=$true}
 }
 if($figure -ne 17){throw ('Expected 17 figures, found '+$figure)}
 WritePart 'word/document.xml' $xml.OuterXml
 @{figures=$figure;edits=$report;preservedParts='Every original package part except word/document.xml and corrected figure media';referenceSHA256=(Get-FileHash -LiteralPath $reference -Algorithm SHA256).Hash} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'document-update.json') -Encoding UTF8
 Write-Output $final
}finally{$zip.Dispose()}
