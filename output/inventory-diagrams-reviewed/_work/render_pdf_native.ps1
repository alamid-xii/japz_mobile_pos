param([string]$PdfPath,[string]$OutDir)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
function AwaitOperation($operation,$returnType){
 $method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'}|Select-Object -First 1
 $task=$method.MakeGenericMethod($returnType).Invoke($null,@($operation));$task.Wait();return $task.Result
}
function AwaitAction($action){
 $method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and !$_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'}|Select-Object -First 1
 $task=$method.Invoke($null,@($action));$task.Wait()
}
New-Item -ItemType Directory -Path $OutDir -Force|Out-Null
$file=AwaitOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($PdfPath)) ([Windows.Storage.StorageFile])
$pdf=AwaitOperation ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
for($i=0;$i -lt $pdf.PageCount;$i++){
 $page=$pdf.GetPage($i);$buffer=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new();$options=[Windows.Data.Pdf.PdfPageRenderOptions]::new();$options.DestinationWidth=1240;$options.DestinationHeight=[uint32](1240*$page.Size.Height/$page.Size.Width)
 AwaitAction ($page.RenderToStreamAsync($buffer,$options));$buffer.Seek(0)
 $inputStream=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($buffer)
 $destination=[IO.File]::Create((Join-Path $OutDir ('page-{0:00}.png' -f ($i+1))));$inputStream.CopyTo($destination);$destination.Dispose();$inputStream.Dispose();$buffer.Dispose();$page.Dispose()
}
Write-Output ('Rendered '+$pdf.PageCount+' pages from Microsoft Word PDF export using Windows PDF.')
