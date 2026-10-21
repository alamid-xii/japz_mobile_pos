$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskRoot=Split-Path $PSScriptRoot -Parent
$manifest=Get-Content (Join-Path $PSScriptRoot 'manifest.json') -Raw | ConvertFrom-Json
$title='JAPZ ERP: JAPZ Grill Burger & Bistro Restaurant Inventory System'
$body=[Text.StringBuilder]::new()
$rels=[Text.StringBuilder]::new()
$files=@{}
function Esc([string]$text) { return [Security.SecurityElement]::Escape($text) }
function P([string]$text,[string]$style='Normal') {
    [void]$body.Append('<w:p><w:pPr><w:pStyle w:val="'+$style+'"/></w:pPr><w:r><w:t xml:space="preserve">'+(Esc $text)+'</w:t></w:r></w:p>')
}
function Section([int]$width,[int]$height,[int]$margin=936) {
    $orient=if($width -gt $height){'landscape'}else{'portrait'}
    return '<w:sectPr><w:headerReference w:type="default" r:id="rHeader"/><w:footerReference w:type="default" r:id="rFooter"/><w:type w:val="nextPage"/><w:pgSz w:w="'+$width+'" w:h="'+$height+'" w:orient="'+$orient+'"/><w:pgMar w:top="'+$margin+'" w:right="'+$margin+'" w:bottom="'+$margin+'" w:left="'+$margin+'" w:header="480" w:footer="480"/><w:cols w:space="720"/></w:sectPr>'
}
function EndSection([int]$width,[int]$height,[int]$margin=936) {
    [void]$body.Append('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>'+(Section $width $height $margin)+'</w:pPr></w:p>')
}
P 'SYSTEM MODELING ACTIVITY' 'Kicker'
P $title 'Title'
P 'Inventory Management Module | 17 Required Diagrams' 'Subtitle'
P 'Project identification' 'Heading1'
P 'The inventory module manages supplies, suppliers, receiving, batches, counts, waste, returns and movement history. It also supports recipes, prepared stock and inventory reports through a React interface, Express services and a MySQL database. Inventory Staff handle daily stock work; Admin controls count approvals, reversals and policy settings.'
P 'Structural blueprinting' 'Heading1'
P 'The System Architecture Diagram identifies the presentation, application and data boundaries that developers must connect. It refines the supplied first version using the actual React/TypeScript/Vite, Node.js/Express, Sequelize and MySQL implementation.'
P 'Behavioral blueprinting' 'Heading1'
P 'The Use Case Diagram defines inventory goals and role permissions. The Activity Diagram maps stock receiving, including duplicate-request checks, unit conversion, atomic updates and rollback on failure.'
P 'Data blueprinting' 'Heading1'
P 'Staff submit delivery lines and a unique request ID. The backend checks access, begins a transaction, checks request identity, validates input and converts quantities to g, ml or pcs. Receipt, line, batch, balance, movement and result changes commit together. Errors roll back; identical retries return the saved result.'
P 'Scope and evidence' 'Heading1'
P 'Current code is the primary evidence, and other modules appear only at inventory boundaries. Examples, modeling abstractions and deployment or timing limitations are identified beside the relevant diagrams.'
P 'Prepared 13 October 2026. No application source or business records were changed.' 'Caption'
EndSection 12240 15840 1440

P 'Diagram index' 'Heading1'
P 'The activity tables do not number their rows. This document numbers their eight structural and nine behavioral diagrams consecutively, preserving the table order and diagram names.'
P 'Structural diagrams - the static blueprint' 'Heading2'
foreach($m in $manifest | Where-Object number -le 8){P ('{0:00}. {1}' -f $m.number,$m.name) 'Index'}
P 'Behavioral diagrams - the system in motion' 'Heading2'
foreach($m in $manifest | Where-Object number -gt 8){P ('{0:00}. {1}' -f $m.number,$m.name) 'Index'}
P 'The activity classifies the SysML Requirement Diagram under its behavioral table; that placement is preserved, while the diagram uses SysML requirement notation.' 'Caption'
P 'Reading and editing' 'Heading2'
P 'Each diagram has its own page, short description, implementation note and source references. Diagram pages use larger paper sizes to preserve readable labels. Editable draw.io files contain individual shapes, text and connectors; SVG and PNG versions use matching filenames.'
P 'Notation references' 'Heading2'
P 'OMG UML 2.5.1: https://www.omg.org/spec/UML/2.5.1/  |  OMG SysML v1: https://www.omg.org/sysml/sysmlv1/' 'Source'
EndSection 12240 15840 1440

$imageId=0
foreach($m in $manifest){
    $imageId++
    # Named geometry overrides: landscape A3 for broad diagrams; portrait A3 for tall diagrams; 16.54 x 20 inches for the class sheet.
    if($m.number -eq 2){$pw=23811;$ph=24480}
    elseif($m.height -gt 1100){$pw=16838;$ph=23811}
    else{$pw=23811;$ph=16838}
    $margin=936
    P ('{0:00}. {1}' -f $m.number,$m.name) 'Heading1'
    $imageHeight=$m.height-68
    $cropTop=[int](6800000/$m.height)
    $scale=[Math]::Min(($pw-2*$margin)/20/$m.width,($ph-2*$margin)/20/($imageHeight+300))
    $cx=[long]($m.width*$scale*12700);$cy=[long]($imageHeight*$scale*12700)
    $rid='rImage'+$imageId
    $filename=$m.slug+'.png'
    $files['word/media/'+$filename]=Join-Path $taskRoot ('png/'+$filename)
    [void]$rels.Append('<Relationship Id="'+$rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+$filename+'"/>')
    $alt=Esc ($m.name+'. '+$m.description)
    [void]$body.Append(@"
<w:p><w:pPr><w:pStyle w:val="DiagramImage"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="$cx" cy="$cy"/><wp:docPr id="$imageId" name="$filename" descr="$alt"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="$filename"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="$rid"/><a:srcRect t="$cropTop"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
"@)
    P $m.description 'Normal'
    P ('Implementation note: '+$m.note) 'Note'
    P ('Source: '+($m.sources -join '; ')) 'Source'
    if($m.number -ne 17){EndSection $pw $ph $margin}
    else{[void]$body.Append((Section $pw $ph $margin))}
}
$styles=@'
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="17212B"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="120" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="180"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="200"/></w:pPr><w:rPr><w:sz w:val="26"/><w:color w:val="53616E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/><w:spacing w:before="240" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/><w:spacing w:before="200" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Kicker"><w:name w:val="Kicker"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="53616E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Index"><w:name w:val="Index"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="60" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="21"/><w:color w:val="53616E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="19"/><w:color w:val="53616E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Source"><w:name w:val="Source"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="60" w:after="60" w:line="260" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="53616E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="DiagramImage"><w:name w:val="DiagramImage"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="160" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
</w:styles>
'@
$parts=@{}
$parts['[Content_Types].xml']='<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'
$parts['_rels/.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
$parts['word/document.xml']='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+$body.ToString()+'</w:body></w:document>'
$parts['word/styles.xml']=$styles
$parts['word/settings.xml']='<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:doNotCompressPictures/><w:defaultTabStop w:val="720"/></w:settings>'
$parts['word/header1.xml']='<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="53616E"/></w:rPr><w:t>JAPZ ERP | Inventory Management</w:t></w:r></w:p></w:hdr>'
$parts['word/footer1.xml']='<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="53616E"/></w:rPr><w:t>Page </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>'
$parts['word/_rels/document.xml.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+$rels.ToString()+'</Relationships>'
$docPath=Join-Path $taskRoot 'JAPZ-Inventory-17-Diagrams.docx'
$stream=[IO.File]::Open($docPath,[IO.FileMode]::Create)
$zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try{
    foreach($item in $parts.GetEnumerator()){
        [xml]$valid=$item.Value
        $entry=$zip.CreateEntry($item.Key)
        $writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false))
        $writer.Write($item.Value);$writer.Dispose()
    }
    foreach($item in $files.GetEnumerator()){
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$item.Value,$item.Key,[IO.Compression.CompressionLevel]::Optimal)
    }
}finally{$zip.Dispose();$stream.Dispose()}
Write-Output $docPath
