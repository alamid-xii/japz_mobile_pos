$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$docPath=Join-Path $taskRoot 'JAPZ-Architecture-Options.docx'
$pdfPath=Join-Path $taskRoot 'JAPZ-Architecture-Options.pdf'
$word=$null;$doc=$null
try{
    $word=New-Object -ComObject Word.Application
    $word.Visible=$false
    $word.DisplayAlerts=0
    $doc=$word.Documents.Open($docPath,$false,$true)
    $doc.Repaginate()
    $doc.ExportAsFixedFormat($pdfPath,17)
    Write-Output ('Pages: '+$doc.ComputeStatistics(2))
    Write-Output $pdfPath
}finally{
    if($doc){$doc.Close(0);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc)}
    if($word){try{$word.Quit()}catch{if($_.Exception.Message -notmatch 'RPC server is unavailable'){throw}};[void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)}
}

