$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$root=Split-Path $PSScriptRoot -Parent
$meta=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'diagrams.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$reference=Join-Path $PSScriptRoot 'reference.docx'
$final=Join-Path $root 'JAPZ-Inventory-17-Diagrams-Teacher-Format.docx'
Copy-Item -LiteralPath $reference -Destination $final -Force
$zip=[IO.Compression.ZipFile]::Open($final,[IO.Compression.ZipArchiveMode]::Update)
function ReadPart($name){$r=[IO.StreamReader]::new($zip.GetEntry($name).Open());try{return $r.ReadToEnd()}finally{$r.Dispose()}}
function WritePart($name,$s){$e=$zip.GetEntry($name);if($e){$e.Delete()};$e=$zip.CreateEntry($name);$w=[IO.StreamWriter]::new($e.Open(),[Text.UTF8Encoding]::new($false));try{$w.Write($s)}finally{$w.Dispose()}}
function Esc($s){[Security.SecurityElement]::Escape($s)}
try{
 [xml]$old=ReadPart 'word/document.xml';$ns=[Xml.XmlNamespaceManager]::new($old.NameTable);$ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
 $sect=$old.SelectSingleNode('//w:body/w:sectPr',$ns).OuterXml
 $body=[Text.StringBuilder]::new();$rels=[Text.StringBuilder]::new()
 function P($s,$style,$break=$false){$page=if($break){'<w:pageBreakBefore/>'}else{''};[void]$body.Append('<w:p><w:pPr><w:pStyle w:val="'+$style+'"/>'+$page+'</w:pPr><w:r><w:t xml:space="preserve">'+(Esc $s)+'</w:t></w:r></w:p>')}
 foreach($d in $meta){
  if($d.n -eq 1){P 'JAPZ ERP: JAPZ Grill Burger & Bistro' 'InventoryTitle';P 'Inventory Management Module' 'InventorySubtitle'}
  P $d.name 'InventoryHeading' ($d.n -gt 1)
  $cx=5731510L;$cy=[long]($cx*$d.h/$d.w)
  $rid='rImage'+$d.n;$filename=('{0:00}.png' -f $d.n);$alt=Esc ($d.name+'. '+$d.description)
  [void]$body.Append(@"
<w:p><w:pPr><w:pStyle w:val="InventoryFigure"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="$cx" cy="$cy"/><wp:docPr id="$($d.n)" name="$filename" descr="$alt"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="$filename"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="$rid"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
"@)
  P ('Figure '+$d.n+'. '+$d.caption) 'InventoryCaption'
  P $d.description 'InventoryBody'
  [void]$rels.Append('<Relationship Id="'+$rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+$filename+'"/>')
 }
 # Keep the reference's A4 portrait geometry and formatting resources. All source content is replaced.
 $keep=@('word/styles.xml','word/fontTable.xml','word/theme/theme1.xml')
 foreach($e in @($zip.Entries)){if($e.FullName -notin $keep){$e.Delete()}}
 [xml]$styles=ReadPart 'word/styles.xml'
 $wns='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
 $styleSpecs=@(
  @('InventoryTitle',28,1,0,100,'left',1),@('InventorySubtitle',24,0,0,200,'left',1),
  @('InventoryHeading',24,1,0,160,'left',1),@('InventoryBody',22,0,100,0,'both',0),
  @('InventoryCaption',20,0,140,120,'center',1),@('InventoryFigure',22,0,0,0,'center',1)
 )
 foreach($s in $styleSpecs){$e=$styles.CreateElement('w','style',$wns);$e.SetAttribute('type',$wns,'paragraph');$e.SetAttribute('styleId',$wns,$s[0]);$b=if($s[2]){'<w:b/>'}else{''};$keepNext=if($s[6]){'<w:keepNext/>'}else{''}
  $e.InnerXml='<w:name xmlns:w="'+$wns+'" w:val="'+$s[0]+'"/><w:basedOn xmlns:w="'+$wns+'" w:val="Normal"/><w:pPr xmlns:w="'+$wns+'">'+$keepNext+'<w:keepLines/><w:widowControl/><w:jc w:val="'+$s[5]+'"/><w:spacing w:before="'+$s[3]+'" w:after="'+$s[4]+'" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr xmlns:w="'+$wns+'"><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="000000"/>'+$b+'<w:sz w:val="'+$s[1]+'"/><w:szCs w:val="'+$s[1]+'"/></w:rPr>'
  [void]$styles.DocumentElement.AppendChild($e)
 }
 # Explicit footer field: no identity or commentary from the teacher's sample.
 $sect=$sect.Replace('<w:pgSz','<w:footerReference w:type="default" r:id="rFooter"/><w:pgSz')
 $doc='<w:document xmlns:w="'+$wns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+$body.ToString()+$sect+'</w:body></w:document>'
 [xml]$check=$doc
 WritePart 'word/document.xml' $doc
 WritePart 'word/styles.xml' $styles.OuterXml
 WritePart 'word/settings.xml' ('<w:settings xmlns:w="'+$wns+'"><w:doNotCompressPictures/><w:updateFields w:val="true"/></w:settings>')
 WritePart 'word/footer1.xml' ('<w:ftr xmlns:w="'+$wns+'"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">JAPZ Inventory | </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>')
 foreach($d in $meta){$filename=('{0:00}.png' -f $d.n);[void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $root "diagrams\$filename"),"word/media/$filename")}
 $relBase='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
 WritePart '_rels/.rels' ($relBase+'<Relationship Id="rDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
 WritePart 'word/_rels/document.xml.rels' ($relBase+'<Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rTheme" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/><Relationship Id="rFonts" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+$rels.ToString()+'</Relationships>')
 WritePart '[Content_Types].xml' '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'
 Write-Output $final
}finally{$zip.Dispose()}
