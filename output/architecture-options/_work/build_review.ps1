$ErrorActionPreference='Stop'
$existingBuilder=Join-Path $PSScriptRoot '..\..\inventory-diagrams\_work\build_document.ps1'
$builder=Get-Content $existingBuilder -Raw
$prefix=$builder.Substring(0,$builder.IndexOf("P 'SYSTEM MODELING ACTIVITY'")).Replace('$PSScriptRoot',("'"+$PSScriptRoot.Replace("'","''")+"'"))
Invoke-Expression $prefix
$body.Clear() | Out-Null
$rels.Clear() | Out-Null
$files=@{}
$imageId=0
foreach($m in $manifest){
    $imageId++
    $direction=if($m.option -eq 'A'){'Minimal Technical Architecture'}else{'Structured Component Architecture'}
    P ('Option '+$m.option+' - '+$direction) 'Heading1'
    P $title 'Subtitle'
    $pw=23811;$ph=16838;$margin=720
    $imageHeight=$m.height-68
    $cropTop=[int](6800000/$m.height)
    $scale=[Math]::Min(($pw-2*$margin)/20/$m.width,(($ph-2*$margin)/20-195)/$imageHeight)
    $cx=[long]($m.width*$scale*12700);$cy=[long]($imageHeight*$scale*12700)
    $rid='rImage'+$imageId
    $filename=$m.slug+'.png'
    $files['word/media/'+$filename]=Join-Path $taskRoot ('png/'+$filename)
    [void]$rels.Append('<Relationship Id="'+$rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+$filename+'"/>')
    $alt=Esc ($m.name+'. '+$m.description)
    [void]$body.Append(@"
<w:p><w:pPr><w:pStyle w:val="DiagramImage"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="$cx" cy="$cy"/><wp:docPr id="$imageId" name="$filename" descr="$alt"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="$filename"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="$rid"/><a:srcRect t="$cropTop"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
"@)
    P $m.description
    P $m.note 'Note'
    if($m.option -eq 'A'){EndSection $pw $ph $margin}else{[void]$body.Append((Section $pw $ph $margin))}
}
$suffix=$builder.Substring($builder.IndexOf('$styles=@')).Replace('JAPZ-Inventory-17-Diagrams.docx','JAPZ-Architecture-Options.docx')
Invoke-Expression $suffix
