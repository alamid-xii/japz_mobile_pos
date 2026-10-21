from pathlib import Path
import urllib.request,json,hashlib,xml.etree.ElementTree as E
p=Path('output/architecture-options/assets');m=json.loads((p/'sources.json').read_text())
for name,url in [('vite.svg','https://raw.githubusercontent.com/vitejs/vite/v7.3.1/docs/public/logo.svg'),('nodejs.svg','https://nodejs.org/static/logos/jsIconGreen.svg')]:
 try:
  data=urllib.request.urlopen(url,timeout=25).read();r=E.fromstring(data);print(name,len(data),r.attrib,sorted(set(v.tag.split('}')[-1] for v in r.iter())))
  (p/name).write_bytes(data)
  for a in m:
   if a['file']==name:a['url']=url;a['sha256']=hashlib.sha256(data).hexdigest()
 except Exception as e:print(name,e)
(p/'sources.json').write_text(json.dumps(m,indent=2))
