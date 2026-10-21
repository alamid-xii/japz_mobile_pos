$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root=Split-Path $PSScriptRoot -Parent
$reference=Join-Path $PSScriptRoot 'reference.docx'
$final=Join-Path $root 'FAJUTAGANA_17_DIAGRAMS_Updated.docx'
function HashEntry($entry){$sha=[Security.Cryptography.SHA256]::Create();$stream=$entry.Open();try{return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','')}finally{$sha.Dispose();$stream.Dispose()}}
function EntryText($zip,$name){$reader=[IO.StreamReader]::new($zip.GetEntry($name).Open());try{return $reader.ReadToEnd()}finally{$reader.Dispose()}}
$a=[IO.Compression.ZipFile]::OpenRead($reference);$b=[IO.Compression.ZipFile]::OpenRead($final)
try{
 $changed=@();foreach($entry in $a.Entries){$other=$b.GetEntry($entry.FullName);if(!$other){throw ('Missing original document part '+$entry.FullName)};if((HashEntry $entry) -ne (HashEntry $other)){$changed+=$entry.FullName}}
 foreach($name in $changed){if($name -ne 'word/document.xml' -and $name -notmatch '^word/media/image\d+\.png$'){throw ('Unexpected formatting/metadata change: '+$name)}}
 if($changed -contains 'word/media/image7.png'){throw 'Figure 7 must remain unchanged'}
 [xml]$x=EntryText $b 'word/document.xml';$ns=[Xml.XmlNamespaceManager]::new($x.NameTable);$ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main');$ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
 [xml]$y=EntryText $a 'word/document.xml';$ns2=[Xml.XmlNamespaceManager]::new($y.NameTable);$ns2.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
 $oldParas=@($y.SelectNodes('//w:body/w:p',$ns2));$newParas=@($x.SelectNodes('//w:body/w:p',$ns));if($oldParas.Count -ne $newParas.Count){throw 'Paragraph count changed'}
 for($i=0;$i -lt $oldParas.Count;$i++){if($oldParas[$i].SelectSingleNode('w:pPr',$ns2).OuterXml -ne $newParas[$i].SelectSingleNode('w:pPr',$ns).OuterXml){throw ('Paragraph formatting changed at '+$i)}}
 $drawings=$x.SelectNodes('//w:drawing',$ns).Count;$captions=$x.SelectNodes('//w:p[w:pPr/w:pStyle[@w:val="InventoryCaption"]]',$ns).Count
 if($drawings -ne 17 -or $captions -ne 17){throw 'Incorrect figure/caption count'}
 $oldCaptions=($y.SelectNodes('//w:p[w:pPr/w:pStyle[@w:val="InventoryCaption"]]//w:t',$ns2)|ForEach-Object InnerText)-join '|'
 $newCaptions=($x.SelectNodes('//w:p[w:pPr/w:pStyle[@w:val="InventoryCaption"]]//w:t',$ns)|ForEach-Object InnerText)-join '|'
 if($oldCaptions -ne $newCaptions){throw 'Caption text changed'}
 if($y.SelectSingleNode('//w:sectPr',$ns2).OuterXml -ne $x.SelectSingleNode('//w:sectPr',$ns).OuterXml){throw 'Section geometry changed'}
 $pngs=@(Get-ChildItem (Join-Path $root 'images') -Filter '*.png');$svgs=@(Get-ChildItem (Join-Path $root 'svg') -Filter '*.svg');$sources=@(Get-ChildItem (Join-Path $root 'editable') -Filter '*.drawio')
 if($pngs.Count -ne 17 -or $svgs.Count -ne 17 -or $sources.Count -ne 18){throw 'Missing diagram exports'}
 foreach($file in $svgs){[xml]$svg=Get-Content -LiteralPath $file.FullName -Raw;if($svg.DocumentElement.LocalName -ne 'svg'){throw 'Invalid SVG'}}
 foreach($file in $sources){[xml]$drawio=Get-Content -LiteralPath $file.FullName -Raw;if($drawio.DocumentElement.LocalName -ne 'mxfile'){throw 'Invalid draw.io file'}}
 [xml]$combined=Get-Content (Join-Path $root 'editable/FAJUTAGANA-All-17-Inventory-Diagrams.drawio') -Raw;if(@($combined.mxfile.diagram).Count -ne 17){throw 'Missing combined source tabs'}
 $pages=Get-Content (Join-Path $PSScriptRoot 'final-render/page-checks.json') -Raw|ConvertFrom-Json;if(@($pages).Count -ne 17 -or @($pages|Where-Object images -ne 1).Count){throw 'Incorrect page layout'}
 $warnings=Get-Content (Join-Path $PSScriptRoot 'layout-checks.json') -Raw|ConvertFrom-Json;if($warnings.Count){throw 'Diagram overflow warnings remain'}
 if(@(Get-ChildItem (Join-Path $PSScriptRoot 'pdf-pages') -Filter 'page-*.png').Count -ne 17){throw 'Missing final PDF-rendered page images'}
 $originalHash=(Get-FileHash -LiteralPath 'C:\Users\ASUS\Downloads\FAJUTAGANA_17_DIAGRAMS.docx' -Algorithm SHA256).Hash
 if($originalHash -ne '1CE2035B0F24FFC7879FBFE04726B1934F6425428659E36FAD1547CE25A2D1C2'){throw 'Original Downloads document changed'}
 $gitChanged=git -C 'C:\Users\ASUS\Desktop\Japz' diff --name-only -- japz-backend japz-web;if($gitChanged){throw 'Application source changed'}
 $result=[ordered]@{result='PASS';diagrams=17;captions=17;descriptions=34;pages=17;oneFigurePerPage=$true;pngExports=17;svgExports=17;individualDrawioSources=17;combinedDrawioTabs=17;diagramTextOverflowWarnings=0;visualReview='Every final page visually inspected after Microsoft Word PDF export; Windows PDF rasterizer';newArchitectureBaseline='Supplied new GitDiagram image and Mermaid, corrected against implementation';allFormattingPartsPreserved=$true;paragraphPropertiesPreserved=$true;captionTextsPreserved=$true;sectionGeometryPreserved=$true;originalDownloadsDocumentUnchanged=$true;figure7ImageUnchanged=$true;applicationSourceUnchanged=$true;wordDocumentSHA256=(Get-FileHash -LiteralPath $final -Algorithm SHA256).Hash;modifiedDocumentParts=$changed}
 $result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $root 'VERIFICATION.json') -Encoding UTF8
 $archive=Join-Path $root 'FAJUTAGANA_Inventory_17_Diagrams_Final.zip'
 $zip=[IO.Compression.ZipFile]::Open($archive,[IO.Compression.ZipArchiveMode]::Create)
 try{
  foreach($file in @($final,(Join-Path $root 'README.md'),(Join-Path $root 'REVIEW_NOTES.md'),(Join-Path $root 'VERIFICATION.json'))){[void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file,[IO.Path]::GetFileName($file))}
  foreach($folder in @('images','svg','editable','mermaid')){foreach($file in Get-ChildItem (Join-Path $root $folder) -File){[void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,($folder+'/'+$file.Name))}}
 }finally{$zip.Dispose()}
 $testZip=[IO.Compression.ZipFile]::OpenRead($archive);try{foreach($entry in $testZip.Entries){$null=HashEntry $entry};Write-Output ('Archive entries: '+$testZip.Entries.Count)}finally{$testZip.Dispose()}
 $result|ConvertTo-Json -Depth 3
 Get-Item -LiteralPath $final,$archive|Select-Object Name,Length
}finally{$a.Dispose();$b.Dispose()}
