from pathlib import Path
import importlib.util, xml.etree.ElementTree as ET, base64, html, json, hashlib, zipfile
import fitz, resvg_py

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('diagram_primitives',ROOT.parent/'inventory-diagrams/_work/build_diagrams.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
base.ROOT=ROOT
base.INK='#283238'
for folder in ('svg','png','editable','_work/qa'):(ROOT/folder).mkdir(parents=True,exist_ok=True)
ASSETS=ROOT/'assets'

class Architecture(base.Diagram):
    def __init__(self,option,w,h,subtitle):
        super().__init__(1,w,h,subtitle)
        self.option=option
        self.ports=[]
        self.slug='Option-'+option+'-'+('Minimal-Technical-Architecture' if option=='A' else 'Structured-Component-Architecture')
    def text(self,x,y,w,h,s,size=21,bold=False,align='center',color='#283238',underline=False):
        color={'#17212b':'#283238','#53616e':'#6c7475'}.get(color,color)
        super().text(x,y,w,h,s,size,bold,align,color,underline)
    def box(self,x,y,w,h,s='',kind='rect',fill='white',size=21,bold=False):
        begin=len(self.svg);cell_begin=len(self.cells)
        super().box(x,y,w,h,s,kind,fill,size,bold)
        for i in range(begin,len(self.svg)):
            self.svg[i]=self.svg[i].replace('stroke="#283238"','stroke="#cdd2cf"').replace('stroke-width="1.7"','stroke-width="1.05"')
        for c in self.cells[cell_begin:]:c.set('style',c.get('style').replace('strokeColor=#283238','strokeColor=#cdd2cf').replace('strokeWidth=1.7','strokeWidth=1.05'))
    def line(self,pts,arrow=None,dashed=False,color='#606a6c',width=1.05):
        color={'#17212b':'#606a6c','#283238':'#606a6c'}.get(color,color)
        begin=len(self.svg)
        super().line(pts,arrow,dashed,color,min(width,1.1))
        for i in range(begin,len(self.svg)):self.svg[i]=self.svg[i].replace('stroke-width="1.5"','stroke-width="1.05"')
    def asset(self,name,x,y,w,h,icon=False,ink='#283238'):
        path=ASSETS/name
        raw=path.read_text(encoding='utf-8')
        root=ET.fromstring(raw)
        if 'viewBox' not in root.attrib:
            ow=root.get('width','24');oh=root.get('height','24')
            root.set('viewBox',f'0 0 {ow} {oh}')
        vx,vy,vw,vh=map(float,root.get('viewBox').replace(',',' ').split())
        scale=min(w/vw,h/vh)
        dx=x+(w-vw*scale)/2-vx*scale;dy=y+(h-vh*scale)/2-vy*scale
        if icon:
            root.set('stroke',ink);root.set('stroke-width','1.5')
        # Preserve official artwork, colors, shape and aspect ratio. Namespace IDs so assets can repeat safely.
        prefix=f'asset{self.count}_'
        ids=[v.get('id') for v in root.iter() if v.get('id')]
        for el in root.iter():
            if el.get('id'):el.set('id',prefix+el.get('id'))
            for key,value in list(el.attrib.items()):
                for ident in ids:value=value.replace(f'url(#{ident})',f'url(#{prefix}{ident})')
                el.set(key,value)
        for el in root.iter():
            if el.tag.endswith('}svg'):
                el.tag='{http://www.w3.org/2000/svg}g'
                for attr in ('width','height','viewBox','x','y','version'):el.attrib.pop(attr,None)
        group=ET.Element('{http://www.w3.org/2000/svg}g',transform=f'translate({dx},{dy}) scale({scale})')
        group.append(root)
        self.svg.append(ET.tostring(group,encoding='unicode'))
        original=ET.fromstring(raw)
        if icon:original.set('stroke',ink);original.set('stroke-width','1.5')
        data=base64.b64encode(ET.tostring(original,encoding='utf-8')).decode()
        self.cell('',f'shape=image;imageAspect=1;aspect=fixed;image=data:image/svg+xml,{data};',x,y,w,h)
    def icon(self,name,x,y,size=30,ink='#283238'):self.asset('lucide-'+name+'.svg',x,y,size,size,True,ink)
    def badge(self,name,x,y,size=44):
        self.svg.append(f'<circle cx="{x+size/2}" cy="{y+size/2}" r="{size/2}" fill="#283238"/>')
        self.cell('','ellipse;fillColor=#283238;strokeColor=none;',x,y,size,size)
        pad=size*.24;self.icon(name,x+pad,y+pad,size-2*pad,'#ffffff')
    def port(self,x,y):
        self.ports.append((x,y))
    def draw_port(self,x,y):
        self.svg.append(f'<circle cx="{x}" cy="{y}" r="3.3" fill="white" stroke="#b3a064" stroke-width="1.05"/>')
        self.cell('','ellipse;fillColor=#ffffff;strokeColor=#b3a064;strokeWidth=1.05;',x-3.3,y-3.3,6.6,6.6)
    def container(self,x,y,w,h,label):
        self.box(x,y,w,h,fill='white')
        self.text(x+24,y+15,w-48,32,label,18,True,'left','#a38f55')
    def subcomponent(self,x,y,w,h,title,desc,icon,size=24,asset=False):
        self.box(x,y,w,h,kind='rect',fill='white')
        if asset:self.asset(icon,x+24,y+24,32,32)
        else:self.badge(icon,x+18,y+19,44)
        self.text(x+78,y+17,w-96,40,title,size,True,'left')
        self.text(x+78,y+59,w-96,h-67,desc,19,False,'left','#53616e')
    def pair(self,a,b):
        # Two simple parallel arrows communicate the real request/response direction without a process-chain interpretation.
        self.line([a,b],arrow='open',width=1.5)
        self.line([(b[0]+22,b[1]),(a[0]+22,a[1])],arrow='open',width=1.5)
        for x,y in [a,b,(b[0]+22,b[1]),(a[0]+22,a[1])]:self.port(x,y)
    def done(self,description,note,sources):
        for x,y in self.ports:self.draw_port(x,y)
        self.finish(description,note,sources)
        (ROOT/'png'/f'{self.slug}.png').write_bytes(resvg_py.svg_to_bytes(svg_path=str(ROOT/'svg'/f'{self.slug}.svg'),zoom=2,background='white',skip_system_fonts=True,font_files=[base.FONT,base.BOLD],font_family='Arial'))
        base.META[-1]['option']=self.option
        base.META[-1]['name']='System Architecture Diagram — Option '+self.option

SOURCES=['japz-web/src/features/inventory/InventoryLayout.tsx','japz-web/src/features/inventory/InventoryData.tsx','japz-web/src/services/api.ts','japz-backend/routes/inventory.js','japz-backend/middleware/access.js','japz-backend/services/inventoryService.js','japz-backend/services/menuAvailability.js','japz-backend/services/inventorySettings.js','japz-backend/models/inventoryModels.js','japz-backend/models/menuItemModel.js','japz-backend/models/db.js']

def minimal():
    d=Architecture('A',1500,1090,'OPTION A  |  Minimal Technical Architecture  |  Inventory Management only')
    d.container(60,155,1380,180,'PRESENTATION LAYER')
    d.badge('monitor',94,214,44)
    d.text(152,208,670,47,'Inventory Web Client',28,True,'left')
    d.text(152,256,710,37,'Stock operations, availability and reports',22,False,'left','#53616e')
    d.asset('react.svg',950,217,38,38);d.text(909,265,125,35,'React',20)
    d.asset('typescript.svg',1116,219,34,34);d.text(1060,265,151,35,'TypeScript',20)
    d.asset('vite.svg',1300,218,36,36);d.text(1260,265,116,35,'Vite',20)
    d.pair((738,335),(738,420))
    d.text(792,357,580,40,'HTTP / JSON · Bearer JWT',22,False,'left')

    d.container(60,420,1380,350,'APPLICATION LAYER')
    d.text(90,467,840,49,'Inventory API',28,True,'left')
    d.text(90,518,910,34,'Inventory endpoints · /api/inventory',21,False,'left','#53616e')
    d.asset('nodejs.svg',1105,473,37,37);d.text(1149,475,111,35,'Node.js',19,False,'left')
    d.asset('express.svg',1285,472,37,37);d.text(1324,475,92,35,'Express',19,False,'left')
    d.subcomponent(90,586,410,122,'Access Control','Checks sessions and permissions','shield-check',23)
    d.subcomponent(545,586,410,122,'Inventory Services','Stock, recipes and settings','boxes',23)
    d.subcomponent(1000,586,410,122,'Sequelize Models','Records, queries and transactions','sequelize.svg',23,True)
    d.text(90,718,1320,33,'Shared responsibilities within one Express application.',18,False,'left','#53616e')

    d.pair((738,770),(738,857))
    d.text(792,790,600,40,'SQL queries and results · mysql2',22,False,'left')
    d.container(60,857,1380,170,'DATA LAYER')
    d.badge('database',94,910,44)
    d.text(152,908,910,45,'Inventory Database',28,True,'left')
    d.text(152,957,1225,38,'Supplies, suppliers, batches, receipts, counts, recipes and movements',22,False,'left','#53616e')
    d.text(1175,912,230,42,'MySQL',26,True)
    d.text(60,1045,1380,31,'Prepared stock uses menu_items. User and order records are shared references at the inventory boundary.',18,False,'left','#53616e')
    d.done('The inventory web client exchanges authenticated JSON requests with one Express inventory API. Access control, inventory services and Sequelize persistence cooperate within the application layer, which stores and reads inventory records in MySQL.', 'Vite provides frontend development/build tooling. Prepared stock uses MenuItem; recipe components are JSON values. This view describes the checked source architecture.',SOURCES)

def structured():
    d=Architecture('B',1800,1090,'OPTION B  |  Structured Component Architecture  |  Inventory Management only')
    d.container(45,165,355,815,'PRESENTATION LAYER')
    d.badge('monitor',79,264,44)
    d.text(138,246,232,85,'Inventory\nWeb Client',27,True,'left')
    d.text(77,356,290,65,'Captures stock changes\nand displays inventory data.',21,False,'left','#53616e')
    d.line([(77,449),(368,449)],color='#d5dade',width=1)
    for asset,label,y in [('react.svg','React',489),('typescript.svg','TypeScript',567),('vite.svg','Vite',645)]:
        d.asset(asset,83,y,33,33);d.text(136,y-1,208,36,label,22,False,'left')
    d.text(77,742,289,115,'Inventory screens\nShared data provider\nAxios HTTP client',21,False,'left','#53616e')
    d.text(77,885,290,59,'Inventory Staff / Admin',20,True,'left')

    d.container(555,165,770,815,'APPLICATION LAYER')
    d.text(582,205,350,40,'Node.js + Express',23,True,'left')
    d.asset('nodejs.svg',1160,210,33,33);d.asset('express.svg',1230,210,33,33)
    d.box(590,275,700,144,fill='white')
    d.text(616,290,640,42,'Inventory API',27,True,'left')
    d.text(616,333,640,32,'/api/inventory',21,False,'left','#53616e')
    d.icon('shield-check',616,374,25)
    d.text(652,367,610,39,'JWT, approved-user and role checks',20,False,'left','#53616e')
    d.text(590,445,430,36,'Inventory handlers and services',20,True,'left','#53616e')
    d.subcomponent(610,512,360,116,'Stock Operations','Receiving, counts, waste and returns','boxes',22)
    d.subcomponent(610,659,360,116,'Recipes & Availability','Recipes and prepared-stock rules','book-open',21)
    d.subcomponent(610,806,360,116,'Reports & Settings','History, summaries and policies','chart-no-axes-combined',22)
    d.box(1090,656,205,180,fill='white')
    d.asset('sequelize.svg',1164,677,38,38)
    d.text(1104,725,177,38,'Sequelize',24,True)
    d.text(1104,766,177,54,'Models and\ntransactions',20,False,color='#53616e')
    # API dispatches to peer groups. Fan-out stays on the left; no arrows connect one service group to the next.
    d.line([(1280,419),(1280,485),(583,485),(583,866)],width=1.5)
    for y in (570,717,864):d.line([(583,y),(610,y)],arrow='open',width=1.5)
    # Peer groups use the same ORM; this is a dependency bus, not a sequential workflow.
    for y in (570,717,864):d.line([(970,y),(1032,y)],width=1.5)
    d.line([(1032,570),(1032,864)],width=1.5)
    d.line([(1032,745),(1090,745)],arrow='open',width=1.5)
    d.text(990,900,294,37,'uses shared models',18,False,color='#53616e')

    d.container(1465,165,290,815,'DATA LAYER')
    d.badge('database',1495,267,44)
    d.text(1550,260,174,45,'MySQL',27,True,'left')
    d.text(1493,328,230,58,'Inventory records\nand shared references',21,False,'left','#53616e')
    d.line([(1493,418),(1727,418)],color='#d5dade',width=1)
    d.text(1493,460,235,102,'Supplies and batches\nReceipts and movements\nCounts and waste',20,False,'left')
    d.text(1493,609,235,73,'Recipes, settings\nand request results',20,False,'left')
    d.text(1493,798,235,120,'Shared records\nUsers · MenuItem · Order\nPrepared stock: MenuItem',18,False,'left','#53616e')

    d.line([(400,326),(590,326)],arrow='open',width=1.5)
    d.line([(590,354),(400,354)],arrow='open',width=1.5)
    d.text(408,249,170,65,'HTTP / JSON\nBearer JWT',19)
    d.line([(1295,729),(1465,729)],arrow='open',width=1.5)
    d.line([(1465,757),(1295,757)],arrow='open',width=1.5)
    for x,y in [(400,326),(590,326),(590,354),(400,354),(1295,729),(1465,729),(1465,757),(1295,757)]:d.port(x,y)
    d.text(1327,641,130,68,'SQL / mysql2\nqueries + results',18)
    d.text(45,1005,1705,57,'API branches target peer handler/service groups; all use shared Sequelize persistence. These are logical groups within one backend application.',19,False,'left','#53616e')
    d.done('This left-to-right view follows the web client through the guarded inventory API to peer handler/service groups and shared Sequelize persistence. The MySQL boundary distinguishes inventory records from user, menu and order references shared with the application.', 'Reports and movement history run in inventory route handlers. Handler/service groups share Sequelize models within one Express backend.',SOURCES)

if __name__=='__main__':
    minimal();structured()
    combined=ET.Element('mxfile',host='app.diagrams.net',version='24.7.17')
    for i,d in enumerate(base.ALL):
        d.set('id','architecture-option-'+str(i));d.set('name','Option '+('A' if i==0 else 'B'));combined.append(d)
    ET.ElementTree(combined).write(ROOT/'editable'/'JAPZ-Architecture-Two-Options.drawio',encoding='utf-8',xml_declaration=True)
    (ROOT/'_work'/'manifest.json').write_text(json.dumps(base.META,indent=2),encoding='utf-8')
    (ROOT/'_work'/'layout-checks.json').write_text(json.dumps(base.CHECKS,indent=2),encoding='utf-8')
    print(json.dumps({'options':2,'layout_issues':base.CHECKS}),flush=True)
