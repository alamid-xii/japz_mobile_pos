from pathlib import Path
import json,zipfile,xml.etree.ElementTree as E,hashlib,fitz
from PIL import Image
root=Path('output/architecture-options');manifest=json.loads((root/'_work/manifest.json').read_text());assert len(manifest)==2
used={'react.svg','typescript.svg','vite.svg','nodejs.svg','express.svg','sequelize.svg','lucide-monitor.svg','lucide-database.svg','lucide-shield-check.svg','lucide-boxes.svg','lucide-book-open.svg','lucide-chart-no-axes-combined.svg'}
assets=[x for x in json.loads((root/'assets/sources.json').read_text()) if x['file'] in used]
assert {x['file'] for x in assets}==used
for a in assets:assert hashlib.sha256((root/'assets'/a['file']).read_bytes()).hexdigest()==a['sha256']
(root/'ASSET-SOURCES.json').write_text(json.dumps(assets,indent=2),encoding='utf-8')
checks=[]
for m in manifest:
 for folder,ext in [('svg','svg'),('png','png'),('editable','drawio')]:assert (root/folder/(m['slug']+'.'+ext)).exists()
 E.parse(root/'svg'/(m['slug']+'.svg'))
 t=E.parse(root/'editable'/(m['slug']+'.drawio'));cells=t.findall('.//mxCell');ids=[c.get('id') for c in cells];assert len(ids)==len(set(ids))
 im=Image.open(root/'png'/(m['slug']+'.png'));assert im.size==(m['width']*2,m['height']*2)
 checks.append({'option':m['option'],'png_size':im.size,'editable_cells':len(cells),'edges':len([c for c in cells if c.get('edge')=='1'])})
assert len(E.parse(root/'editable/JAPZ-Architecture-Two-Options.drawio').findall('diagram'))==2
with zipfile.ZipFile(root/'JAPZ-Architecture-Options.docx') as z:
 assert z.testzip() is None
 E.fromstring(z.read('word/document.xml'))
 assert len([n for n in z.namelist() if n.startswith('word/media/')])==2
pdf=fitz.open(root/'JAPZ-Architecture-Options.pdf');assert len(pdf)==2
assert all(len(p.get_images())==1 for p in pdf)
assert 'Option A' in pdf[0].get_text() and 'Option B' in pdf[1].get_text()
files=[root/'JAPZ-Architecture-Options.docx',root/'README.md',root/'ASSET-SOURCES.json']
for folder in ['svg','png','editable']:files.extend(sorted((root/folder).iterdir()))
files.extend(root/'assets'/a for a in sorted(used))
archive=root/'JAPZ-Architecture-Options-Package.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for file in files:z.write(file,file.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
(root/'_work/qa/final-checks.json').write_text(json.dumps({'options':checks,'docx_images':2,'rendered_word_pages':2,'archive_files':len(files),'layout_checks':json.loads((root/'_work/layout-checks.json').read_text())},indent=2))
print(json.dumps({'verified':checks,'Word_pages':2,'package_files':len(files),'package_bytes':archive.stat().st_size},indent=2))
