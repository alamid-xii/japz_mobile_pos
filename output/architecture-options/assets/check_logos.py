from pathlib import Path
import urllib.request,xml.etree.ElementTree as E,fitz,json,hashlib
p=Path('output/architecture-options/assets')
url='https://nodejs.org/static/logos/nodejsDark.svg';data=urllib.request.urlopen(url,timeout=20).read();(p/'nodejs.svg').write_bytes(data)
m=json.loads((p/'sources.json').read_text())
for a in m:
 if a['file']=='nodejs.svg':a['url']=url;a['sha256']=hashlib.sha256(data).hexdigest()
(p/'sources.json').write_text(json.dumps(m,indent=2))
for name in ['vite.svg','nodejs.svg']:
 r=E.fromstring((p/name).read_text());print(name,r.attrib);print('NestedSVG',[(v.tag,v.attrib) for v in r.iter() if v.tag.endswith('}svg')][1:]);print('defs',[(v.tag.split('}')[-1],v.get('id')) for v in r.iter() if v.get('id')][:15])
 d=fitz.open(stream=(p/name).read_bytes(),filetype='svg'); pdf=fitz.open('pdf',d.convert_to_pdf());page=pdf[0];page.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False).save(str(p/(name+'.png')))
