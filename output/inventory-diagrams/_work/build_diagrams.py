from pathlib import Path
import html, json, math, re, textwrap, xml.etree.ElementTree as ET
from PIL import ImageFont
import fitz

ROOT=Path(__file__).resolve().parents[1]
for folder in ('svg','png','editable','_work/qa'):
    (ROOT/folder).mkdir(parents=True,exist_ok=True)
INK='#17212b'; MUTED='#53616e'; LIGHT='#f4f6f8'; BLUE='#294b68'
FONT='C:/Windows/Fonts/arial.ttf'; BOLD='C:/Windows/Fonts/arialbd.ttf'
NAMES=['System Architecture Diagram','Class Diagram','Component Diagram','Deployment Diagram','Object Diagram','Package Diagram','Composite Structure Diagram','Profile Diagram','Data Flow Diagram (DFD)','Use Case Diagram','Activity Diagram','Sequence Diagram','State Machine Diagram','Communication Diagram','Interaction Overview Diagram','Timing Diagram','Requirement Diagram (SysML)']
TITLE='JAPZ ERP: JAPZ Grill Burger & Bistro Restaurant Inventory System'
META=[]; ALL=[]; CHECKS=[]

class Diagram:
    def __init__(self,n,w=1500,h=950,subtitle=''):
        self.n=n;self.w=w;self.h=h;self.svg=[];self.cells=[];self.count=1
        self.name=NAMES[n-1];self.slug=f'{n:02d}-'+re.sub(r'[^A-Za-z0-9]+','-',self.name).strip('-')
        self.text(42,20,w-84,48,f'{n:02d}  {self.name}',30,True,'left')
        self.text(42,73,w-84,35,subtitle,20,False,'left',MUTED)
        self.line([(42,116),(w-42,116)],color='#c9d0d7')
    def cell(self,value,style,x,y,w,h,edge=False,points=None):
        self.count+=1
        c=ET.Element('mxCell',id=str(self.count),value=value,style=style,parent='1',**({'edge':'1'} if edge else {'vertex':'1'}))
        g=ET.SubElement(c,'mxGeometry',**({'relative':'1','as':'geometry'} if edge else {'x':str(x),'y':str(y),'width':str(w),'height':str(h),'as':'geometry'}))
        if edge:
            ET.SubElement(g,'mxPoint',x=str(points[0][0]),y=str(points[0][1]),**{'as':'sourcePoint'})
            ET.SubElement(g,'mxPoint',x=str(points[-1][0]),y=str(points[-1][1]),**{'as':'targetPoint'})
            if len(points)>2:
                arr=ET.SubElement(g,'Array',**{'as':'points'})
                for px,py in points[1:-1]: ET.SubElement(arr,'mxPoint',x=str(px),y=str(py))
        self.cells.append(c)
    def text(self,x,y,w,h,s,size=21,bold=False,align='center',color=INK,underline=False):
        font=ImageFont.truetype(BOLD if bold else FONT,size)
        lines=[]
        for raw in s.split('\n'):
            if not raw: lines.append('');continue
            line=''
            for word in raw.split(' '):
                test=(line+' '+word).strip()
                if font.getlength(test)>w-12 and line: lines.append(line);line=word
                else: line=test
            lines.append(line)
        line_h=size*1.25;total=len(lines)*line_h
        if total>h+1: CHECKS.append(f'{self.n}: text overflow {s[:60]} {total}>{h}')
        ty=y+(h-total)/2+size
        for i,l in enumerate(lines):
            if font.getlength(l)>w+1: CHECKS.append(f'{self.n}: long word {l}')
            tx=x+6 if align=='left' else x+w/2
            self.svg.append(f'<text x="{tx}" y="{ty+i*line_h}" font-family="Arial" font-size="{size}" font-weight="{"bold" if bold else "normal"}" fill="{color}" text-anchor="{"start" if align=="left" else "middle"}"'+(' text-decoration="underline"' if underline else '')+'>'+html.escape(l)+'</text>')
            if underline:
                length=font.getlength(l);start=tx if align=='left' else tx-length/2
                self.svg.append(f'<line x1="{start}" y1="{ty+i*line_h+3}" x2="{start+length}" y2="{ty+i*line_h+3}" stroke="{color}" stroke-width="1"/>')
        style=f'text;html=1;strokeColor=none;fillColor=none;align={align};verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Arial;fontSize={size};fontColor={color};fontStyle={int(bold)+4*int(underline)};'
        self.cell(html.escape(s).replace('\n','<br>'),style,x,y,w,h)
    def box(self,x,y,w,h,s='',kind='rect',fill='white',size=21,bold=False):
        stroke=f'stroke="{INK}" stroke-width="1.7" fill="{fill}"'
        style=f'html=1;whiteSpace=wrap;fillColor={fill};strokeColor={INK};strokeWidth=1.7;'
        if kind=='store':
            self.svg.append(f'<path d="M{x+w},{y} H{x} V{y+h} H{x+w} M{x+38},{y} V{y+h}" {stroke}/>');style+='shape=partialRectangle;right=0;'
        elif kind=='ellipse': self.svg.append(f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" {stroke}/>');style+='ellipse;'
        elif kind=='diamond': self.svg.append(f'<path d="M {x+w/2},{y} L {x+w},{y+h/2} L {x+w/2},{y+h} L {x},{y+h/2} Z" {stroke}/>');style+='rhombus;'
        elif kind=='note': self.svg.append(f'<path d="M{x},{y} H{x+w-20} L{x+w},{y+20} V{y+h} H{x} Z M{x+w-20},{y} V{y+20} H{x+w}" {stroke}/>');style+='shape=note;size=20;'
        elif kind=='cylinder':
            self.svg.append(f'<path d="M{x},{y+22} C{x},{y-7} {x+w},{y-7} {x+w},{y+22} V{y+h-22} C{x+w},{y+h+7} {x},{y+h+7} {x},{y+h-22} Z M{x},{y+22} C{x},{y+51} {x+w},{y+51} {x+w},{y+22}" {stroke}/>');style+='shape=cylinder;size=22;'
        elif kind=='package':
            self.svg.append(f'<path d="M{x},{y+26} V{y} H{x+w*.55} V{y+26} H{x+w} V{y+h} H{x} Z M{x},{y+26} H{x+w*.55}" {stroke}/>');style+='shape=folder;tabWidth=90;tabHeight=26;'
        elif kind=='node':
            self.svg.append(f'<path d="M{x},{y+20} L{x+24},{y} H{x+w} V{y+h-20} L{x+w-24},{y+h} H{x} Z M{x},{y+20} H{x+w-24} L{x+w},{y} M{x+w-24},{y+20} V{y+h}" {stroke}/>');style+='shape=cube;size=20;'
        else:
            radius=12 if kind=='round' else 0
            self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" {stroke}/>');style+=f'rounded={int(kind=="round")};arcSize=12;'
        self.cell('',style,x,y,w,h)
        if s:
            tx=x+48 if kind=='store' else x+10
            ty=y+43 if kind=='cylinder' else y+8
            tw=w-58 if kind=='store' else w-20
            th=h-57 if kind=='cylinder' else h-16
            self.text(tx,ty,tw,th,s,size,bold)
    def line(self,pts,arrow=None,dashed=False,color=INK,width=1.7):
        p=' '.join(f'{x},{y}' for x,y in pts)
        marker=''
        if dashed:
            for a,b in zip(pts,pts[1:]):
                dist=math.dist(a,b)
                if not dist:continue
                ux,uy=(b[0]-a[0])/dist,(b[1]-a[1])/dist
                for start in range(0,math.ceil(dist),12):
                    end=min(start+7,dist)
                    self.svg.append(f'<line x1="{a[0]+ux*start}" y1="{a[1]+uy*start}" x2="{a[0]+ux*end}" y2="{a[1]+uy*end}" stroke="{color}" stroke-width="{width}"/>')
        else:self.svg.append(f'<polyline points="{p}" fill="none" stroke="{color}" stroke-width="{width}"{marker}/>')
        if arrow:
            a,b=pts[-2],pts[-1];dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
            ux,uy=dx/length,dy/length
            scale=15 if arrow=='hollow' else 11
            l=(b[0]-scale*ux-6*uy,b[1]-scale*uy+6*ux)
            r=(b[0]-scale*ux+6*uy,b[1]-scale*uy-6*ux)
            path=f'M{l[0]},{l[1]} L{b[0]},{b[1]} L{r[0]},{r[1]}'
            fill='none' if arrow=='open' else ('white' if arrow=='hollow' else color)
            if arrow!='open':path+=' Z'
            self.svg.append(f'<path d="{path}" fill="{fill}" stroke="{color}" stroke-width="1.5"/>')
        ar={'open':'open','filled':'block','hollow':'block','extension':'block'}.get(arrow,'none')
        self.cell('',f'endArrow={ar};endFill={0 if arrow in ("open","hollow") else 1};startArrow=none;strokeWidth={width};strokeColor={color};dashed={int(dashed)};rounded=0;',0,0,0,0,True,pts)
    def edge(self,pts,label='',lx=None,ly=None,lw=260,arrow='open',dashed=False,lh=31):
        self.line(pts,arrow,dashed)
        if label:
            if lx is None:lx=(pts[0][0]+pts[-1][0])/2-lw/2
            if ly is None:ly=(pts[0][1]+pts[-1][1])/2-32
            self.text(lx,ly,lw,lh,label,18)
    def dot(self,x,y,final=False):
        self.box(x-12,y-12,24,24,kind='ellipse',fill='white' if final else INK)
        if final:self.box(x-7,y-7,14,14,kind='ellipse',fill=INK)
    def actor(self,x,y,name):
        self.box(x+28,y,34,34,kind='ellipse')
        self.line([(x+45,y+34),(x+45,y+94)])
        self.line([(x+5,y+53),(x+85,y+53)])
        self.line([(x+45,y+94),(x+12,y+134)])
        self.line([(x+45,y+94),(x+78,y+134)])
        self.text(x-52,y+138,195,60,name,20)
    def clazz(self,x,y,w,title,attrs,methods=None,size=18):
        ah=len(attrs)*24+18; mh=(len(methods or [])*24+18) if methods else 0;h=58+ah+mh
        self.box(x,y,w,h,fill='white')
        self.text(x+5,y+5,w-10,48,title,21,True)
        self.line([(x,y+58),(x+w,y+58)])
        if attrs:self.text(x+10,y+66,w-20,ah-10,'\n'.join(attrs),size,align='left')
        if methods:
            self.line([(x,y+58+ah),(x+w,y+58+ah)])
            self.text(x+10,y+66+ah,w-20,mh-10,'\n'.join(methods),size,align='left')
        return h
    def footer(self,s): self.text(42,self.h-69,self.w-84,50,s,18,align='left',color=MUTED)
    def finish(self,desc,note,sources):
        defs='''<defs><marker id="open" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M1,1 L10,6 L1,11" fill="none" stroke="#17212b" stroke-width="1.4"/></marker><marker id="filled" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M1,1 L10,6 L1,11 Z" fill="#17212b"/></marker><marker id="extension" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M1,1 L10,6 L1,11 Z" fill="#17212b"/></marker><marker id="hollow" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto"><path d="M1,1 L12,7 L1,13 Z" fill="white" stroke="#17212b" stroke-width="1.3"/></marker></defs>'''
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}"><title>{html.escape(self.name)}</title><desc>{html.escape(desc)}</desc>{defs}<rect width="100%" height="100%" fill="white"/>'+''.join(self.svg)+'</svg>'
        (ROOT/'svg'/f'{self.slug}.svg').write_text(svg,encoding='utf-8')
        doc=fitz.open(stream=svg.encode(),filetype='svg'); pdf=fitz.open('pdf',doc.convert_to_pdf());pdf[0].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).save(str(ROOT/'png'/f'{self.slug}.png'))
        model=ET.Element('mxGraphModel',dx=str(self.w),dy=str(self.h),grid='1',gridSize='10',guides='1',tooltips='1',connect='1',arrows='1',fold='1',page='1',pageScale='1',pageWidth=str(self.w),pageHeight=str(self.h),math='0',shadow='0')
        r=ET.SubElement(model,'root');ET.SubElement(r,'mxCell',id='0');ET.SubElement(r,'mxCell',id='1',parent='0')
        for c in self.cells:r.append(c)
        d=ET.Element('diagram',id=f'inventory-{self.n:02d}',name=f'{self.n:02d} {self.name}');d.append(model)
        mx=ET.Element('mxfile',host='app.diagrams.net',version='24.7.17');mx.append(d)
        ET.ElementTree(mx).write(ROOT/'editable'/f'{self.slug}.drawio',encoding='utf-8',xml_declaration=True)
        ALL.append(d);META.append(dict(number=self.n,name=self.name,slug=self.slug,width=self.w,height=self.h,description=desc,note=note,sources=sources))

def architecture():
    d=Diagram(1,subtitle='Inventory module | verified three-layer architecture')
    d.box(230,160,1040,165,fill=LIGHT)
    d.text(255,168,990,34,'PRESENTATION LAYER',21,True)
    d.text(255,207,990,47,'Inventory web interface | React + TypeScript + Vite',25,True)
    d.text(255,261,990,48,'Receiving, supplies, counts, recipes, prepared stock, history and reports',21)
    d.edge([(750,325),(750,407)],'HTTP / JSON + Bearer JWT',780,345,360,arrow='open')
    d.box(230,407,1040,260,fill=LIGHT)
    d.text(255,419,990,63,'APPLICATION LAYER | Node.js + Express\n/api/inventory',23,True)
    boxes=[(270,'Authentication\nand role access'),(620,'Stock services\nand validation'),(970,'Sequelize models\nand transactions')]
    for x,s in boxes:d.box(x,510,260,100,s,kind='round')
    d.edge([(530,560),(620,560)]);d.edge([(880,560),(970,560)])
    d.edge([(750,667),(750,746)],'SQL / mysql2',785,686,235)
    d.box(230,746,1040,122,'DATA LAYER | MySQL: japz_pos\nInventory tables + shared Users, menu_items and Orders',kind='cylinder',size=23)
    d.footer('Inventory Staff and Admin use the inventory interface; Cashier and Kitchen interact only at inventory boundaries.')
    d.finish('The inventory browser interface sends authenticated JSON requests to Express. Inventory services validate stock operations and persist related records through Sequelize in MySQL.', 'Vite is the development server/build tool. Prepared stock is stored on MenuItem, not in a separate prepared-stock table. This diagram refines the user-supplied first-version reference.', ['japz-web/src/features/inventory/InventoryLayout.tsx','japz-web/src/services/api.ts','japz-backend/routes/inventory.js','japz-backend/models/db.js'])

def classes():
    d=Diagram(2,1800,1570,'UML classes | selected attributes, implemented associations and service operations')
    d.clazz(55,165,335,'Supplier',['id: Integer','name: String','active: Boolean'])
    d.clazz(550,165,420,'StockItem',['id: Integer; code: String','kind: ingredient | packaging','unit: pcs | g | ml','unitsPerPurchase: Decimal','onHand, reserved: Decimal','supplierId: Integer [0..1]','version: Integer'])
    d.clazz(1210,165,480,'StockBatch',['id, stockItemId: Integer','code: String','onHand, reserved: Decimal','unitCost: Decimal','expiryDate: Date [0..1]','quarantined: Boolean'])
    d.edge([(390,248),(550,248)],arrow=None);d.text(390,204,62,35,'0..1',18);d.text(488,204,62,35,'0..*',18)
    d.edge([(970,290),(1210,290)],'1 item       0..* batches',985,250,215,arrow=None)
    d.clazz(55,530,335,'StockReceipt',['id: Integer; number: String','supplierId: Integer [0..1]','receivedAt: DateTime','userId: Integer'])
    d.clazz(550,530,420,'StockReceiptLine',['id, receiptId: Integer','stockItemId, batchId: Integer','purchaseQuantity: Decimal','purchaseUnit: String','conversion, quantity: Decimal','unitCost: Decimal'])
    d.clazz(1210,530,480,'StockMovement',['id: Integer; action: Enum','stockItemId, batchId: Integer [0..1]','menuItemId, orderId: Integer [0..1]','onHandDelta, reservedDelta: Decimal','onHandBefore, onHandAfter: Decimal','operationKey: String {unique}','reversesId: Integer [0..1] {unique}'])
    d.edge([(222,313),(222,530)],'0..1 supplier / 0..* receipts',231,418,360,arrow=None)
    d.edge([(390,625),(550,625)],arrow=None);d.text(390,578,62,35,'1',18);d.text(488,578,62,35,'0..*',18)
    d.edge([(720,530),(720,409)],'1 item / 0..* lines',735,447,240,arrow=None)
    d.edge([(970,674),(1055,674),(1055,440),(1330,440),(1330,385)],'1 batch / 0..* lines',1030,447,235,arrow=None)
    d.edge([(1510,385),(1510,530)],'0..1 batch / 0..* movements',1518,437,265,arrow=None)
    d.text(55,812,1690,46,'Supporting inventory classes (references shown as typed attributes)',23,True,'left')
    d.clazz(55,880,390,'StockCount',['stockItemId, batchId: Integer','expectedVersion: Integer','countedQuantity, difference: Decimal','status: pending | applied | rejected | stale','userId; reviewedById [0..1]'],size=17)
    d.clazz(495,880,390,'WasteReport',['stockItemId: Integer','batchId: Integer [0..1]','quantity: Decimal; reason: Text','status: pending | accepted | rejected','userId; reviewedById [0..1]'],size=17)
    d.clazz(935,880,390,'MenuRecipe',['menuItemId: Integer','components: JSON[]','profileKey: String','version: Integer; current: Boolean','userId: Integer'],size=18)
    d.clazz(1375,880,370,'MenuItem (shared)',['id: Integer','inventoryMode: prepared | recipe','stock, reservedStock: Integer','reorderLevel: Integer','archived: Boolean'],size=18)
    d.edge([(1325,988),(1375,988)],arrow=None)
    d.text(1315,1121,440,27,'0..* recipes / 1 menu item',17)
    d.clazz(55,1170,390,'InventoryOperation',['requestId: String {unique}','kind, fingerprint: String','userId: Integer; result: JSON'])
    d.clazz(495,1170,390,'InventorySettings',['id: Integer (= 1)','refreshSeconds: Integer','countApproval: Enum; version: Integer'])
    d.clazz(935,1170,390,'StockAllocation',['orderId: Integer {unique}','state: reserved | consumed |','released | wasted','prepared, supplies, recipes: JSON[]'],size=18)
    d.clazz(1375,1170,370,'«utility» inventoryService',[],['+ receiveStock(payload, user)','+ countStock(payload, user)','+ reviewCount(id, decision, user)','+ supplyMovement(..., transaction)'],size=17)
    d.footer('All models inherit Sequelize Model operations. Common id/timestamps and nonessential fields are omitted. JSON components are embedded values, not tables.')
    d.finish('This class diagram shows the receiving model relationships and the supporting inventory classes, with selected attributes and actual service functions. Stock quantities use decimals for supplies and integers for prepared menu stock.', 'Multiplicity is shown on the principal associations; supporting references remain typed attributes to preserve readability. StockCount/WasteReport link to StockItem and StockBatch; MenuRecipe links to MenuItem; StockAllocation links to Order. User audit references are shown without expanding user management. Service functions are module operations, not invented model methods.', ['japz-backend/models/inventoryModels.js','japz-backend/models/index.js','japz-backend/models/menuItemModel.js','japz-backend/services/inventoryService.js'])

def components():
    d=Diagram(3,subtitle='UML components | inventory software dependencies')
    for x,y,w,h,s in [(65,205,340,145,'«component»\nInventory screens\nReact / TypeScript'),(65,545,340,145,'«component»\nInventoryData + api.ts\nRefresh + Axios client'),(575,205,350,145,'«component»\nInventory router\nExpress /api/inventory'),(1055,205,365,145,'«component»\nAccess middleware\nauthenticate / allowRoles'),(575,545,350,145,'«component»\nInventory services\nStock, recipes, settings'),(1055,545,365,145,'«component»\nInventory persistence\nSequelize + mysql2')]:
        d.box(x,y,w,h,s);d.box(x+w-38,y+14,24,32,fill=LIGHT);d.box(x+w-44,y+18,12,8,fill='white');d.box(x+w-44,y+33,12,8,fill='white')
    d.edge([(235,350),(235,545)],'«use»',240,426,150,dashed=True)
    d.edge([(405,615),(490,615),(490,280),(575,280)],'JSON API',405,371,150,dashed=True)
    d.edge([(925,275),(1055,275)],'«use»',920,232,145,dashed=True)
    d.edge([(750,350),(750,545)],'«use»',760,426,150,dashed=True)
    d.edge([(925,615),(1055,615)],'«use»',917,572,150,dashed=True)
    d.box(550,768,900,85,'inventoryOrders.js uses stock services and menu availability\nExternal order integration: reserve, consume, release or record waste',kind='note',size=20)
    d.footer('Dashed dependency arrows point from the dependent component to the component it uses.')
    d.finish('Inventory screens depend on the shared inventory data provider and HTTP client. The Express router uses access checks, domain services and Sequelize persistence; order integration remains an external inventory boundary.', 'These are logical software components within one frontend and one backend application. No microservice deployment or independent API gateway is implemented.', ['japz-web/src/features/inventory/InventoryData.tsx','japz-web/src/services/api.ts','japz-backend/routes/inventory.js','japz-backend/services/inventoryOrders.js'])

def deployment():
    d=Diagram(4,subtitle='UML deployment | code-configured local development topology')
    d.box(65,165,1370,620,fill=LIGHT)
    d.text(88,175,1280,42,'«device» Developer workstation / local host',25,True,'left')
    d.box(110,270,350,395,kind='node');d.text(126,294,300,60,'«executionEnvironment»\nWeb browser',23,True)
    d.box(142,420,280,150,'«artifact»\nInventory UI\nReact + TypeScript')
    d.box(575,270,350,395,kind='node');d.text(592,292,298,90,'«executionEnvironment»\nNode.js\nExpress :3000',22,True)
    d.box(610,427,272,145,'«artifact»\nBackend inventory code\nSequelize + mysql2')
    d.box(1035,270,350,395,kind='node');d.text(1055,293,295,72,'«executionEnvironment»\nMySQL :3306',23,True)
    d.box(1069,427,270,145,'«artifact»\njapz_pos schema\nInventory + shared tables')
    d.edge([(460,495),(575,495)],arrow=None);d.text(455,374,125,110,'HTTP\nJSON\nJWT',19)
    d.edge([(925,495),(1035,495)],arrow=None);d.text(923,381,116,88,'MySQL\nprotocol',19)
    d.box(110,710,1275,56,'Vite serves frontend source at :5173; production builds are static assets in japz-web/dist.',size=20)
    d.footer('Communication paths use solid lines. All environments are nested in one device because this view documents local development.')
    d.finish('The deployment diagram maps the inventory artifacts to the local browser, Node.js runtime and MySQL service. The configured development ports are 5173 for Vite, 3000 for Express and 3306 for MySQL.', 'This is the configured local topology, not a fresh observation of running processes. render.yaml is a backend hosting configuration; live hosting, cloud networking, load balancing and backups are not verified.', ['start-local.ps1','japz-backend/index.js','japz-backend/models/db.js','japz-web/package.json','render.yaml'])

def objects():
    d=Diagram(5,subtitle='UML object snapshot | illustrative result after a successful stock receipt')
    def obj(x,y,w,h,name,s):
        d.box(x,y,w,h);d.text(x+10,y+7,w-20,48,name,21,True,underline=True);d.line([(x,y+58),(x+w,y+58)]);d.text(x+15,y+66,w-30,h-78,s,20,align='left')
    obj(55,170,350,160,'supplier1 : Supplier','id = 1\nname = "Example supplier"\nactive = true')
    obj(565,170,400,235,'item7 : StockItem','id = 7; supplierId = 1\nname = "Example ingredient"\nunit = "g"; purchaseUnit = "kg"\nunitsPerPurchase = 1000\nonHand = 2000; reserved = 0\nversion = 1')
    obj(1110,170,335,235,'batch21 : StockBatch','id = 21; stockItemId = 7\ncode = "EXAMPLE-LOT"\nonHand = 2000; reserved = 0\nunitCost = 0.05\nexpiryDate = null\nquarantined = false')
    obj(55,555,350,190,'receipt10 : StockReceipt','id = 10; supplierId = 1\nnumber = "RCV-EXAMPLE"\nuserId = 3\nreceivedAt = illustrative time')
    obj(565,555,400,235,'line11 : StockReceiptLine','id = 11; receiptId = 10\nstockItemId = 7; batchId = 21\npurchaseQuantity = 2\npurchaseUnit = "kg"\nconversion = 1000; quantity = 2000\nunitCost = 0.05')
    obj(1110,555,335,235,'move12 : StockMovement','id = 12; stockItemId = 7\nbatchId = 21; receiptId = 10\naction = "receive"\nonHandDelta = 2000\nonHandBefore = 0\nonHandAfter = 2000')
    for pts in [[(405,252),(565,252)],[(965,282),(1110,282)],[(230,330),(230,555)],[(405,660),(565,660)],[(730,405),(730,555)],[(965,650),(1020,650),(1020,454),(1200,454),(1200,405)],[(1290,405),(1290,555)]]:d.line(pts)
    d.footer('EXAMPLE ONLY: no live database values. 2 kg × 1000 g/kg = 2000 g; 50 per kg ÷ 1000 = 0.05 per g.')
    d.finish('This object diagram instantiates the receiving classes after one example receipt. Underlined instance names, attribute slots and solid links show a consistent snapshot of supplier, item, batch, receipt, line and movement objects.', 'All IDs, names, dates and values are illustrative. They describe a valid implemented operation and do not claim these records exist in the business database.', ['japz-backend/models/inventoryModels.js','japz-backend/services/inventoryService.js:390'])

def packages():
    d=Diagram(6,subtitle='UML packages | actual code organization')
    d.box(60,170,590,660,fill=LIGHT);d.text(85,175,540,45,'japz-web/src',25,True,'left')
    d.box(95,268,500,255,kind='package');d.text(115,304,460,200,'features/inventory\nInventoryLayout, InventoryData\nReceiving, Supplies, Suppliers\nCountsLosses, MenuStock\nHistoryReports, Settings',22)
    d.box(95,620,500,150,kind='package');d.text(112,655,466,94,'services + hooks + utils\napi.ts, useAuth.tsx, requestId.ts',21)
    d.edge([(345,523),(345,620)],'«use»',352,555,145,dashed=True)
    d.box(850,170,590,660,fill=LIGHT);d.text(877,175,540,45,'japz-backend',25,True,'left')
    d.box(885,267,500,120,kind='package');d.text(905,300,460,70,'routes + middleware\ninventory.js, access.js',21)
    d.box(885,475,500,120,kind='package');d.text(905,507,460,75,'services\ninventoryService, menuAvailability,\ninventoryOrders, inventorySettings',20)
    d.box(885,684,500,120,kind='package');d.text(905,715,460,75,'models\ninventoryModels.js, index.js, db.js',21)
    d.edge([(650,392),(760,392),(760,327),(885,327)],'HTTP API',659,411,190,dashed=True)
    d.edge([(1135,387),(1135,475)],'«use»',1143,410,145,dashed=True)
    d.edge([(1135,595),(1135,684)],'«use»',1143,619,145,dashed=True)
    d.footer('Folder symbols denote logical UML packages mapped to source directories; dependency arrows point to the package used.')
    d.finish('The package diagram groups inventory source files by their actual frontend and backend directories. It shows the dependency path from inventory screens to the HTTP client, backend routes, services and models.', 'Packages are documentation groupings of JavaScript/TypeScript directories, not separately deployable services. Shared code is included only where inventory depends on it.', ['japz-web/src/features/inventory','japz-web/src/services/api.ts','japz-backend/routes/inventory.js','japz-backend/services','japz-backend/models'])

def composite():
    d=Diagram(7,subtitle='UML composite structure | logical internals of the Express inventory router')
    d.box(270,165,1080,620,fill=LIGHT);d.text(295,178,1015,65,'inventoryRouter : Express.Router\nstructured classifier (logical view)',25,True,'left')
    d.box(260,340,20,20,fill='white');d.box(1340,595,20,20,fill='white')
    d.box(42,307,178,90,'HTTP client\n: Axios',size=20)
    d.box(340,302,300,140,'access : Middleware\nauthenticate()\nallowRoles()',size=22)
    d.box(890,302,335,140,'handler : RouteHandler\nrun(action)\nJSON / error response',size=22)
    d.box(340,567,300,140,'service : StockService\nreceiveStock()\ncountStock()',size=22)
    d.box(890,567,335,140,'models : SequelizeModels\nStockItem, StockBatch\nStockReceipt, StockMovement',size=21)
    d.line([(220,350),(270,350),(340,350)])
    d.text(290,446,350,32,'request port: /api/inventory',19)
    d.line([(640,372),(890,372)]);d.text(660,324,210,35,'next()',20)
    d.line([(1055,442),(1055,490),(490,490),(490,567)]);d.text(668,500,270,34,'invoke inventory service',19)
    d.line([(640,636),(890,636)]);d.text(660,592,215,34,'model operations',19)
    d.line([(1225,605),(1350,605),(1430,605)])
    d.text(1253,652,195,62,'SQL persistence\nport',19)
    d.footer('Small squares are ports; solid connectors link typed parts. This is a logical classifier view of existing code, not a new class.')
    d.finish('The composite structure diagram opens the inventory router boundary to show its collaborating middleware, route handler, stock service and Sequelize model parts. Ports represent the HTTP request boundary and SQL persistence boundary.', 'The implementation uses modules, functions and an Express Router object. This UML structured classifier is a documentation abstraction, not an additional runtime inventory class.', ['japz-backend/routes/inventory.js','japz-backend/middleware/access.js','japz-backend/services/inventoryService.js'])

def profile():
    d=Diagram(8,subtitle='UML profile | explicit modeling convention for this documentation')
    d.box(60,160,1380,660,kind='package',fill=LIGHT)
    d.text(90,190,1280,58,'«profile» JAPZInventoryProfile',27,True,'left')
    specs=[(280,'InventoryRecord','tableName: String\nExample: StockBatch','Class'),(470,'InventoryService','sourceFile: String\nExample: inventoryService.js','Component'),(660,'StockOperation','transactional: Boolean\nExample: receiveStock()','Operation')]
    for y,name,tags,meta in specs:
        d.box(135,y,520,126,f'«stereotype» {name}\n{tags}',size=23)
        d.box(1020,y,320,126,f'«metaclass»\n{meta}',size=24)
        d.edge([(655,y+63),(1020,y+63)],'extension',715,y+19,250,arrow='extension')
    d.footer('Extension arrows point to UML metaclasses. Tags annotate the model; stereotypes do not create application code or tables.')
    d.finish('This profile defines three inventory-specific UML stereotypes for records, service components and stock operations. Each stereotype extends the appropriate UML metaclass and supplies concise documentation tags.', 'No UML profile is implemented or loaded by the application. This newly defined documentation profile fulfills the activity table without claiming a runtime feature or industry certification.', ['japz-backend/models/inventoryModels.js','japz-backend/services/inventoryService.js','OMG UML 2.5.1, Profiles'])

def dfd():
    d=Diagram(9,1500,1050,'Level 1 DFD | stock receiving data and persistence; inventory-only scenario')
    d.box(60,190,270,115,'Inventory Staff\nor Admin',size=24)
    d.box(580,190,365,115,'1.0 Authenticate\nInventory Request',kind='round',size=24)
    d.box(1155,190,270,115,'D1  Users',size=23,kind='store')
    d.edge([(330,236),(580,236)],'JWT + delivery data',331,191,245)
    d.edge([(945,230),(1155,230)],'user ID',960,193,180)
    d.edge([(1155,276),(945,276)],'approved user + role',955,293,205)
    d.box(580,439,365,140,'2.0 Validate and\nRecord Stock Receipt',kind='round',size=24)
    d.edge([(760,305),(760,439)],'authorized request',780,355,240)
    d.box(60,440,340,140,'D2  Inventory operations\nrequestId + fingerprint\n+ saved result',size=21,kind='store')
    d.edge([(580,487),(400,487)],'operation + result',395,446,178)
    d.edge([(400,545),(580,545)],'previous result',398,573,175)
    d.box(1155,440,290,140,'D3  Stock records\nitems, batches, receipts,\nlines and movements',size=21,kind='store')
    d.edge([(1155,478),(945,478)],'items / supplier data',945,438,207)
    d.edge([(945,545),(1155,545)],'receipt + stock updates',945,580,208)
    d.box(580,762,365,115,'3.0 Present Receipt\nand Stock Balances',kind='round',size=24)
    d.edge([(760,579),(760,762)],'result / validation error',773,654,260)
    d.edge([(1295,580),(1295,817),(945,817)],'receipt / balances',1020,768,235)
    d.edge([(580,817),(25,817),(25,350),(195,350),(195,305)],'receipt / balances / errors',72,716,450)
    d.footer('Gane-Sarson notation: rectangles = external entity; rounded numbered boxes = processes; divided open-store style = data stores.')
    d.finish('This level 1 DFD follows stock receiving data from an authorized actor through authentication, receipt processing and presentation. It includes user records, duplicate-request records and the stock persistence data store.', 'D3 groups actual inventory tables, including suppliers; it is not a new database table. The browser subsequently reads updated balances. DFD arrows carry data and do not imply transaction control order.', ['japz-backend/routes/inventory.js','japz-backend/middleware/access.js','japz-backend/services/inventoryService.js','japz-web/src/features/inventory/Receiving.tsx'])

def usecases():
    d=Diagram(10,1500,1130,'UML use cases | actual permissions of inventory and boundary actors')
    d.box(285,155,930,850);d.text(310,169,880,50,'Inventory Management',25,True)
    goals=[('View stock and availability',240),('Maintain supplies and suppliers',350),('Receive stock / prepared stock',460),('Manage recipes and batches',570),('Record counts, waste and returns',680),('Review waste reports',790),('View history, reports and settings',900)]
    d.actor(125,470,'Inventory Staff\nrole: inventory')
    for label,y in goals:
        d.box(460,y,550,72,label,kind='ellipse',size=22)
        d.line([(214,560),(330,560),(330,y+36),(460,y+36)])
    d.actor(1260,430,'Admin\nrole: admin')
    d.edge([(1305,430),(1305,227),(170,227),(170,470)],arrow='hollow')
    d.box(1025,640,160,75,'Approve counts',kind='ellipse',size=18)
    d.box(1025,755,160,95,'Reverse movements /\nset policy',kind='ellipse',size=18)
    d.line([(1260,520),(1238,520),(1238,678),(1185,678)])
    d.line([(1238,678),(1238,800),(1185,800)])
    d.actor(70,860,'Cashier\nrole: cashier')
    d.line([(161,912),(260,912),(260,276),(460,276)])
    d.actor(1260,880,'Kitchen Staff\nrole: kitchen')
    d.box(1025,877,160,96,'Submit / view\nown waste reports',kind='ellipse',size=18)
    d.line([(1260,940),(1185,925)])
    d.line([(1260,916),(1225,916),(1225,276),(1010,276)])
    d.footer('Actor generalization points from Admin to Inventory Staff capability. Kitchen/Cashier have API read access; inventory screens require Inventory/Admin.')
    d.finish('This use case diagram shows the inventory goals available to Inventory Staff and Admin, including the Admin-only count review, reversal and policy controls. Cashier and Kitchen actors appear only for relevant read access and Kitchen waste reporting.', 'Authentication is a precondition for all use cases. The Admin actor generalization represents shared inventory capabilities, not a role inheritance mechanism in the code. Count approval policy and adjustment limits are Admin-controlled; ordinary Inventory settings remain editable by Inventory Staff.', ['japz-backend/routes/inventory.js','japz-backend/services/inventorySettings.js','japz-web/src/App.tsx','japz-web/src/features/inventory/InventoryLayout.tsx'])

def activity():
    d=Diagram(11,1500,1160,'UML activity | atomic stock receiving with safe retries')
    d.dot(730,165)
    d.box(510,210,440,72,'Enter delivery and submit requestId',kind='round');d.edge([(730,177),(730,210)])
    d.box(510,326,440,72,'Authenticate and authorize actor',kind='round');d.edge([(730,282),(730,326)])
    d.box(510,442,440,72,'Begin transaction; check request identity',kind='round',size=20);d.edge([(730,398),(730,442)])
    d.box(640,555,180,100,'Existing\nrequest?',kind='diamond',size=19);d.edge([(730,514),(730,555)])
    d.box(1000,550,380,110,'Same actor, kind and fingerprint?\nReturn saved result if identical;\notherwise reject with conflict.',kind='round',size=19)
    d.edge([(820,605),(1000,605)],'[yes]',831,564,145)
    d.box(510,703,440,92,'Create operation; lock stock items;\nvalidate supplier, date and delivery lines',kind='round',size=20)
    d.edge([(730,655),(730,703)],'[no]',745,657,100)
    d.box(510,843,440,92,'Convert units; create receipt / batches;\nupdate balances; append movements / lines',kind='round',size=20)
    d.edge([(730,795),(730,843)])
    d.box(510,973,440,72,'Save result; commit; refresh stock',kind='round',size=21);d.edge([(730,935),(730,973)])
    d.dot(730,1090,True);d.edge([(730,1045),(730,1078)])
    d.box(70,714,325,140,'Exception path:\nRoll back transaction\nShow validation / save error',kind='round',size=22)
    d.edge([(510,480),(430,480),(430,759),(395,759)],'exception',269,445,210,dashed=True)
    d.edge([(510,748),(395,748)],dashed=True)
    d.edge([(510,880),(430,880),(430,805),(395,805)],dashed=True)
    d.dot(230,900,True);d.edge([(230,854),(230,888)])
    d.edge([(1190,660),(1190,1090),(742,1090)])
    d.footer('The exception path aborts the save; correction starts a new submission. No receipt, balance or movement is partially committed.')
    d.finish('The activity diagram shows a stock receipt from submission through access checks, request identity handling, unit conversion and transactional persistence. Identical retries return the saved result; failed operations roll back.', 'Exception connectors summarize failure exits from transaction actions. A correction resubmits through the form; the next refresh reads balances rather than retrying a failed save automatically.', ['japz-backend/services/inventoryService.js:111','japz-backend/services/inventoryService.js:390','japz-backend/routes/inventory.js','japz-web/src/features/inventory/Receiving.tsx'])

def sequence():
    d=Diagram(12,1500,1220,'UML sequence | POST /api/inventory/receive, successful new request')
    xs=[135,435,785,1230];names=['Inventory Staff','Receiving UI\n+ Axios','Inventory router\n+ stock services','Sequelize / MySQL']
    for x,name in zip(xs,names):d.box(x-125,160,250,83,name,size=20);d.line([(x,243),(x,1110)],dashed=True)
    for x,y,h in [(435,288,772),(785,350,615),(1230,421,492)]:d.box(x-7,y,14,h,fill=LIGHT)
    messages=[(0,1,292,'1. submit(delivery, requestId)',False),(1,2,350,'2. POST /receive + Bearer JWT',False),(2,3,405,'3. load approved user; check role',False),(3,2,453,'4. user / permission result',True),(2,3,511,'5. BEGIN; find InventoryOperation',False),(3,2,555,'6. no existing request',True),(2,3,622,'7. create operation; lock items; create receipt',False),(2,3,701,'8. each line: validate, convert; create batch',False),(2,3,776,'9. each line: balances → movement → line',False),(2,3,850,'10. save operation result; COMMIT',False),(3,2,916,'11. committed receipt',True),(2,1,977,'12. JSON { receipt }',True),(1,0,1060,'13. show success; refresh balances',True)]
    for a,b,y,s,dash in messages:d.edge([(xs[a],y),(xs[b],y)],s,min(xs[a],xs[b])+10,y-55,abs(xs[a]-xs[b])-20,arrow='open' if dash else 'filled',dashed=dash,lh=50)
    d.box(55,1130,1385,60,'Alternative: identical request returns stored result; changed identity → 409; any transactional exception → rollback.',kind='note',size=19)
    d.finish('This sequence follows a successful new receiving request through the UI, Express inventory handler and Sequelize/MySQL persistence. The related receipt, batches, balance changes, movements and operation result commit together.', 'Router and stock service share a lifeline for readability; Sequelize and MySQL also share a persistence lifeline. Return arrows are dashed. Identical retries and rollback are documented alternatives to this main scenario.', ['japz-web/src/features/inventory/Receiving.tsx','japz-backend/middleware/access.js','japz-backend/services/inventoryService.js:111','japz-backend/services/inventoryService.js:390'])

def state():
    d=Diagram(13,1500,1050,'UML state machine | StockCount.status lifecycle')
    d.dot(110,250);d.box(265,190,220,120,'Approval\nrequired?',kind='diamond',size=22)
    d.edge([(122,250),(265,250)],'valid count',108,199,150)
    d.box(625,190,270,120,'pending\nBalance unchanged',kind='round',size=23)
    d.box(1110,495,290,120,'applied\nCount movement saved',kind='round',size=23)
    d.edge([(485,250),(625,250)],'[yes]',490,207,125)
    d.edge([(375,190),(375,145),(1450,145),(1450,550),(1400,550)],'[no] / apply count immediately',1020,361,370)
    d.box(665,495,190,110,'Approval\nstill valid?',kind='diamond',size=20)
    d.edge([(760,310),(760,495)],'Admin approves',773,378,220)
    d.edge([(855,550),(1110,550)],'[version matches and count ≥ reserved]\n/ apply count movement',902,642,490,lh=55)
    d.box(620,772,280,115,'stale\nNew count required',kind='round',size=23)
    d.edge([(760,605),(760,772)],'[version changed or count < reserved]',815,671,555)
    d.box(100,495,295,115,'rejected\nBalance unchanged',kind='round',size=23)
    d.edge([(625,250),(520,250),(520,550),(395,550)],'Admin rejects',95,387,290)
    d.footer('Invalid submission is rejected before a StockCount is created. applied, rejected and stale have no further status transitions in this API.')
    d.finish('The state machine models the four implemented StockCount status values. A valid count is immediately applied or placed in pending review; Admin review applies, rejects or marks it stale if the balance version or reserved quantity makes it unsafe.', 'The initial decision occurs before record creation and depends on actor role, countApproval and adjustmentLimit. A stale record stays historical; recounting creates a new record. No automatic review timer exists.', ['japz-backend/models/inventoryModels.js','japz-backend/services/inventoryService.js:597','japz-backend/services/inventoryService.js:678'])

def communication():
    d=Diagram(14,1500,1050,'UML communication | numbered message network for stock receiving')
    d.box(75,220,330,135,': InventoryStaff',size=25)
    d.box(585,220,340,135,': ReceivingUI / Axios',size=24)
    d.box(1090,220,330,135,': inventoryRouter',size=25)
    d.box(1090,685,330,155,': inventoryService',size=24)
    d.box(570,685,355,155,': Sequelize / MySQL',size=24)
    d.line([(405,285),(585,285)]);d.line([(925,285),(1090,285)]);d.line([(1255,355),(1255,685)]);d.line([(1090,760),(925,760)])
    d.edge([(425,267),(565,267)],'1: submit delivery',405,218,175)
    d.edge([(945,267),(1070,267)],'1.1: POST /receive',920,193,175)
    d.edge([(1236,390),(1236,650)],'1.1.1: authorize\n1.1.2: receiveStock()',947,416,266,lh=60)
    d.edge([(1060,737),(955,737)],'1.1.2.1: BEGIN / identity check\n1.1.2.2: lock, validate, convert\n1.1.2.3: receipt + stock writes\n1.1.2.4: save result / COMMIT',510,475,520,lh=120)
    d.edge([(955,799),(1060,799)],'1.1.2.5: saved receipt',930,852,210,dashed=True)
    d.edge([(1280,650),(1280,390)],'1.1.3: JSON receipt',1290,493,175,dashed=True,lh=60)
    d.edge([(1070,320),(945,320)],'1.2: receipt result',925,367,210,dashed=True)
    d.box(85,640,330,185,'Numbering shows nested calls.\nSolid links show communication paths.\nDashed arrows show replies.',kind='note',size=22)
    d.footer('Communication topology is emphasized; message sequence is carried by numbering, not vertical lifelines.')
    d.finish('This communication diagram uses the same receiving scenario as the sequence diagram, emphasizing the network of collaborating objects. Hierarchical message numbers identify the request, service call, transactional operations and replies.', 'Access middleware is summarized in the router interaction; it loads the approved user before the service runs. The transaction alternatives are the same as in Diagrams 11 and 12.', ['japz-backend/routes/inventory.js','japz-backend/services/inventoryService.js','japz-web/src/features/inventory/Receiving.tsx'])

def overview():
    d=Diagram(15,1500,1190,'UML interaction overview | receiving interaction and readback')
    def ref(x,y,w,h,s,size=22):
        d.box(x,y,w,h)
        d.line([(x+62,y),(x+62,y+23),(x+50,y+35),(x,y+35)])
        d.text(x+3,y+2,51,29,'ref',18,True)
        d.text(x+10,y+38,w-20,h-46,s,size)
    d.dot(730,165)
    ref(480,215,500,125,'Submit and authorize receiving\nUI → Inventory API → access middleware',20)
    d.edge([(730,177),(730,215)])
    d.box(645,400,170,110,'Access\nallowed?',kind='diamond',size=21);d.edge([(730,340),(730,400)])
    ref(80,408,330,125,'Show 401 / 403\nUI keeps form unchanged',21)
    d.edge([(645,455),(410,455)],'[no]',435,412,150)
    ref(480,577,500,148,'Receive stock transaction\nIdentity check → conversion → stock writes\nSee Sequence Diagram 12',20)
    d.edge([(730,510),(730,577)],'[yes]',749,529,150)
    d.box(645,780,170,110,'Committed or\nreplayed?',kind='diamond',size=18);d.edge([(730,725),(730,780)])
    ref(1030,775,365,128,'Rollback and return error\nUI shows failed-save message',21)
    d.edge([(815,835),(1030,835)],'[no]',844,791,145)
    ref(480,960,500,105,'Refresh inventory data\nGET stock / history → display balances',20)
    d.edge([(730,890),(730,960)],'[yes]',749,910,150)
    d.dot(730,1123,True);d.edge([(730,1065),(730,1111)])
    d.edge([(245,533),(245,1123),(718,1123)]);d.edge([(1210,903),(1210,1123),(742,1123)])
    d.footer('Framed ref nodes are interaction uses; diamonds and initial/final nodes control the overall interaction flow.')
    d.finish('The interaction overview connects receiving authorization, the detailed stock transaction and inventory readback as referenced interactions. Decisions route denied access and failed transactions to their corresponding UI outcomes.', 'The stock transaction interaction is expanded in Diagram 12. Failure paths end the current attempt; a corrected submission begins a new interaction. No parallel background save is implied.', ['japz-backend/middleware/access.js','japz-backend/services/inventoryService.js','japz-web/src/features/inventory/Receiving.tsx','japz-web/src/features/inventory/InventoryData.tsx'])

def timing():
    d=Diagram(16,1500,1080,'UML timing | visible inventory refresh; configured default interval = 30 seconds')
    d.box(50,156,1395,160,'Scenario: refresh finishes before the next scheduled tick; the tab remains visible.\nElapsed response durations are illustrative, not measured or guaranteed.\nThe code permits refreshSeconds from 15 to 120 seconds and uses a 15-second Axios timeout.',kind='note',size=22)
    x0=310;x1=1370
    for t in [0,15,30,45,60]:
        x=x0+t/60*(x1-x0);d.line([(x,369),(x,918)],dashed=True,color='#c9d0d7');d.text(x-35,924,70,34,str(t),20)
    d.edge([(x0,976),(x1,976)],'elapsed time (seconds)',700,990,410)
    def wave(label,y,states):
        d.text(55,y-20,205,90,label,20,True,'left')
        d.text(230,y-35,75,35,'true',17);d.text(230,y+55,75,35,'false',17)
        pts=[]
        for t,val in states:pts.append((x0+t/60*(x1-x0),y if val else y+80))
        d.line(pts,width=2)
    wave('tab : Document\nvisible',405,[(0,True),(60,True)])
    wave('provider : InventoryData\nrefreshing',595,[(0,True),(3,True),(3,False),(30,False),(30,True),(34,True),(34,False),(60,False),(60,True)])
    wave('client : Axios\nrequest pending',805,[(0,True),(3,True),(3,False),(30,False),(30,True),(34,True),(34,False),(60,False),(60,True)])
    d.edge([(310,530),(840,530)],'{scheduled interval = 30 s}',390,490,430,arrow=None)
    d.text(344,690,460,54,'success → data and updated timestamp set',19)
    d.text(877,690,480,54,'next success → data and timestamp replaced',19)
    d.finish('This timing diagram shows the visible-tab state and refresh/request states across the configured 30-second polling ticks. The initial refresh and subsequent successful requests update the inventory data and timestamp.', 'The illustrated 3- and 4-second request durations are examples only. setInterval is a schedule, not a deadline guarantee; hidden tabs skip interval-triggered requests, focus/manual refresh can run earlier, and older responses are ignored using a sequence counter. No real-time push or hard latency guarantee is implemented.', ['japz-web/src/features/inventory/InventoryData.tsx','japz-web/src/services/api.ts','japz-backend/services/inventorySettings.js'])

def requirements():
    d=Diagram(17,1500,1210,'SysML requirements | implementation-derived rules and satisfying elements')
    reqs=[('INV-01','Authorized inventory changes','Only approved Inventory/Admin may write stock.','«block» access middleware\nauthenticate + allowRoles'),('INV-02','Atomic and repeat-safe receiving','One receipt operation commits together; identical requestId replays its result.','«block» inventoryService\ninventoryOperation + receiveStock'),('INV-03','Safe available stock','Exclude expired / held batches; preserve reservations; allocate FEFO.','«block» stock / order services\nlistStockItems + reserveOrder'),('INV-04','Controlled physical counts','Reject stale submissions; route required counts to Admin; protect reserved stock.','«block» inventoryService\ncountStock + reviewCount'),('INV-05','Historical stock records','Append movements with actor, reason and quantity deltas; version recipes.','«block» stock / recipe services\nsupplyMovement + saveRecipe')]
    for i,(rid,name,txt,block) in enumerate(reqs):
        y=165+i*190
        d.box(680,y,735,145);d.text(695,y+8,705,36,'«requirement» '+name,22,True)
        d.line([(680,y+50),(1415,y+50)])
        d.text(695,y+56,705,82,'id = '+rid+'\ntext = '+txt,20,align='left')
        d.box(65,y+15,420,115,block,size=22)
        d.edge([(485,y+75),(680,y+75)],'«satisfy»',478,y+24,200,dashed=True)
    d.footer('«satisfy» dependencies point from implementation elements to requirements. These rules are traced to source, not claimed as new client mandates.')
    d.finish('The requirement diagram expresses five concrete inventory rules supported by the implementation and links each rule to the code element that satisfies it. SysML requirement blocks carry an ID and requirement text; satisfy arrows point to the requirement.', 'These are implementation-derived documentation requirements. No independent client requirement baseline, formal SysML model or real-time performance requirement was supplied. Test code was inspected for corresponding scenarios; this document does not claim a fresh test execution.', ['japz-backend/middleware/access.js','japz-backend/services/inventoryService.js','japz-backend/services/inventoryOrders.js','japz-backend/services/menuAvailability.js','japz-backend/tests/inventory.test.js'])

if __name__=='__main__':
    for f in [architecture,classes,components,deployment,objects,packages,composite,profile,dfd,usecases,activity,sequence,state,communication,overview,timing,requirements]:
        f(); print(f.__name__,flush=True)
    mx=ET.Element('mxfile',host='app.diagrams.net',version='24.7.17')
    for d in ALL:mx.append(d)
    ET.ElementTree(mx).write(ROOT/'editable'/'JAPZ-Inventory-All-17-Diagrams.drawio',encoding='utf-8',xml_declaration=True)
    (ROOT/'_work'/'manifest.json').write_text(json.dumps(META,indent=2),encoding='utf-8')
    (ROOT/'_work'/'layout-checks.json').write_text(json.dumps(CHECKS,indent=2),encoding='utf-8')
    print('Layout checks:',json.dumps(CHECKS),flush=True)
