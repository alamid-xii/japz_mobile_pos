from pathlib import Path
import urllib.request,zipfile,io,json,hashlib
root=Path('output/architecture-options/assets')
assets={
 'react.svg':'https://raw.githubusercontent.com/facebook/react/main/fixtures/dom/public/react-logo.svg',
 'vite.svg':'https://v7.vite.dev/logo.svg',
 'nodejs.svg':'https://nodejs.org/static/logos/nodejsLight.svg',
 'express.svg':'https://expressjs.com/favicon.svg',
 'sequelize.svg':'https://sequelize.org/img/logo.svg',
 'mysql.png':'https://www.mysql.com/common/logos/logo-mysql-170x115.png',
 'lucide-shield-check.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg',
 'lucide-boxes.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/boxes.svg',
 'lucide-chart-no-axes-combined.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/chart-no-axes-combined.svg',
 'lucide-file-json.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/file-json.svg',
 'lucide-settings-2.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/settings-2.svg',
 'lucide-book-open.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/book-open.svg',
 'lucide-database.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/database.svg',
 'lucide-monitor.svg':'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/monitor.svg',
}
manifest=[]
for name,url in assets.items():
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  response=urllib.request.urlopen(req,timeout=25);data=response.read()
  assert b'<svg' in data[:1500] if name.endswith('svg') else data.startswith(b'\x89PNG')
  (root/name).write_bytes(data)
  manifest.append(dict(file=name,url=url,sha256=hashlib.sha256(data).hexdigest()))
  print(name,len(data))
 except Exception as e:print('FAILED',name,str(e))
url='https://www.typescriptlang.org/branding/typescript-design-assets.zip'
try:
 data=urllib.request.urlopen(url,timeout=25).read();z=zipfile.ZipFile(io.BytesIO(data));names=[x for x in z.namelist() if x.endswith('.svg')];print('TypeScript SVGs:',names)
 for name in names:
  if 'ts-logo-128' in name.lower() or 'typescript-icon' in name.lower():
   data=z.read(name);(root/'typescript.svg').write_bytes(data);manifest.append(dict(file='typescript.svg',url=url,archive_member=name,sha256=hashlib.sha256(data).hexdigest()));print('TypeScript selected',name);break
 (root/'typescript-assets.zip').write_bytes(z.fp.getvalue())
except Exception as e:print('TypeScript',e)
(root/'sources.json').write_text(json.dumps(manifest,indent=2))
