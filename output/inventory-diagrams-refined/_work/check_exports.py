from pathlib import Path
import json, zipfile, xml.etree.ElementTree as ET
import pymupdf as fitz
from PIL import Image

root=Path(__file__).resolve().parents[1]
meta=json.loads((root/'_work/manifest.json').read_text())
assert len(meta)==17 and [m['number'] for m in meta]==list(range(1,18))
for m in meta:
    for folder,ext in [('svg','svg'),('png','png'),('editable','drawio')]:
        p=root/folder/f"{m['slug']}.{ext}";assert p.exists() and p.stat().st_size>1000
        if ext in ('svg','drawio'):ET.parse(p)
    with Image.open(root/'png'/f"{m['slug']}.png") as im:
        assert im.size==(m['width']*2,m['height']*2)
mx=ET.parse(root/'editable/JAPZ-Inventory-All-17-Diagrams.drawio')
assert len(mx.getroot().findall('diagram'))==17
for d in mx.getroot():assert len(d.findall('.//mxCell'))>20
with zipfile.ZipFile(root/'JAPZ-Inventory-17-Diagrams.docx') as z:
    assert len([n for n in z.namelist() if n.startswith('word/media/')])==17
    ET.fromstring(z.read('word/document.xml'));ET.fromstring(z.read('word/styles.xml'))
pdf=fitz.open(root/'JAPZ-Inventory-17-Diagrams.pdf')
assert len(pdf)==19
qa=root/'_work/qa';qa.mkdir(exist_ok=True)
pages=[]
for i,p in enumerate(pdf):
    if i>1:assert f"{i-1:02d}. {meta[i-2]['name']}" in p.get_text(),(i,p.get_text())
    p.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False).save(qa/f'page-{i+1:02d}.png')
    pages.append(dict(page=i+1,width=p.rect.width,height=p.rect.height,images=len(p.get_images()),text=p.get_text()))
(qa/'page-checks.json').write_text(json.dumps(pages,indent=2),encoding='utf-8')
print('PASS: 17 SVG, 17 PNG, 17 individual draw.io, one 17-page draw.io; DOCX has 17 images; Word PDF has 19 pages in exact order.')
