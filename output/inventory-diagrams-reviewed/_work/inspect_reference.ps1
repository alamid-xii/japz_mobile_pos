$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root=Split-Path $PSScriptRoot -Parent
$source='C:\Users\ASUS\Downloads\FAJUTAGANA_17_DIAGRAMS.docx'
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'reference-media'),(Join-Path $PSScriptRoot 'reference-render') -Force | Out-Null
$stream=[IO.File]::Open($source,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
$destination=[IO.File]::Create((Join-Path $PSScriptRoot 'reference.docx'));$stream.CopyTo($destination);$destination.Dispose();$stream.Dispose()
$zip=[IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'reference.docx'))
function ReadPart($name){$reader=[IO.StreamReader]::new($zip.GetEntry($name).Open());try{return $reader.ReadToEnd()}finally{$reader.Dispose()}}
try {
 [xml]$xml=ReadPart 'word/document.xml';[xml]$rels=ReadPart 'word/_rels/document.xml.rels'
 $ns=[Xml.XmlNamespaceManager]::new($xml.NameTable)
 $ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main');$ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main');$ns.AddNamespace('wp','http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing');$ns.AddNamespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
 $paragraphs=@();$i=0
 foreach($p in $xml.SelectNodes('//w:body/w:p',$ns)){
  $text=($p.SelectNodes('.//w:t',$ns)|ForEach-Object {$_.InnerText}) -join ''
  $image=$p.SelectSingleNode('.//a:blip',$ns);$rid=if($image){$image.GetAttribute('embed','http://schemas.openxmlformats.org/officeDocument/2006/relationships')}else{''}
  $target=if($rid){($rels.Relationships.Relationship|Where-Object Id -eq $rid).Target}else{''}
  $paragraphs+=@{index=$i;text=$text;image=$target;xml=$p.OuterXml};$i++
 }
 foreach($entry in $zip.Entries|Where-Object FullName -like 'word/media/*'){[IO.Compression.ZipFileExtensions]::ExtractToFile($entry,(Join-Path $PSScriptRoot ('reference-media/'+[IO.Path]::GetFileName($entry.FullName))),$true)}
 @{source=$source;sha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash;paragraphs=$paragraphs;section=$xml.SelectSingleNode('//w:sectPr',$ns).OuterXml;tables=$xml.SelectNodes('//w:tbl',$ns).Count;drawings=$xml.SelectNodes('//w:drawing',$ns).Count} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'reference-structure.json') -Encoding UTF8
 $paragraphs|Where-Object { $_.text -match '^(Figure \d+\.|.*Diagram$)' }|Select-Object index,text,image|ConvertTo-Json -Depth 3
} finally {$zip.Dispose()}
