from pathlib import Path
import importlib.util, json, re, shutil, xml.etree.ElementTree as ET
import resvg_py

ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT.parent/'inventory-diagrams/_work/build_diagrams.py'
spec=importlib.util.spec_from_file_location('old_diagrams',OLD)
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
Original=b.Diagram
b.ROOT=ROOT;b.INK='#283238';b.MUTED='#6c7475';b.LIGHT='#fafbf9'
for f in ['svg','png','editable','assets','_work/qa']:(ROOT/f).mkdir(parents=True,exist_ok=True)
for f in (ROOT.parent/'architecture-options/assets').glob('*.svg'):shutil.copy2(f,ROOT/'assets'/f.name)
spec=importlib.util.spec_from_file_location('approved_arch',ROOT.parent/'architecture-options/build_options.py')
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
a.ROOT=ROOT;a.ASSETS=ROOT/'assets';a.base.ROOT=ROOT
a.base.META=b.META;a.base.ALL=b.ALL;a.base.CHECKS=b.CHECKS

def render(d):
    (ROOT/'png'/f'{d.slug}.png').write_bytes(resvg_py.svg_to_bytes(svg_path=str(ROOT/'svg'/f'{d.slug}.svg'),zoom=2,background='white',skip_system_fonts=True,font_files=[b.FONT,b.BOLD],font_family='Arial'))

class Formal(Original):
    def text(self,x,y,w,h,s,size=21,bold=False,align='center',color='#283238',underline=False):
        s=s.replace('Only approved Inventory/Admin may write stock.','Direct stock writes require approved Inventory/Admin.')
        if self.n==7 and s=='SQL persistence\nport':x=1367;y=637;w=125;h=90
        if self.n==9 and s=='operation + result':s='identity + result'
        # UML multiplicities belong at association ends, not in sentence labels.
        mult={'1 item       0..* batches':[(978,245,'1'),(1140,245,'0..*')],
              '0..1 supplier / 0..* receipts':[(230,330,'0..1'),(230,487,'0..*')],
              '1 item / 0..* lines':[(727,408,'1'),(727,487,'0..*')],
              '1 batch / 0..* lines':[(1337,390,'1'),(982,627,'0..*')],
              '0..1 batch / 0..* movements':[(1516,389,'0..1'),(1516,487,'0..*')],
              '0..* recipes / 1 menu item':[(1135,847,'0..*'),(1568,847,'1')]}
        if self.n==2 and s in mult:
            for xx,yy,ss in mult[s]:self.text(xx,yy,65,31,ss,18)
            return
        color={'#17212b':'#283238','#53616e':'#6c7475'}.get(color,color)
        begin=len(self.svg)
        super().text(x,y,w,h,s,size,bold,align,color,underline)
        if underline:
            for i in range(begin,len(self.svg)):self.svg[i]=self.svg[i].replace(' text-decoration="underline"','')
    def box(self,x,y,w,h,s='',kind='rect',fill='white',size=21,bold=False):
        if self.n==9 and kind=='round' and s:
            number,label=s.split(' ',1)
            self.box(x,y,w,h,kind='round',fill=fill)
            self.line([(x,y+32),(x+w,y+32)])
            self.text(x+10,y+2,w-20,28,number,18,True)
            self.text(x+12,y+39,w-24,h-47,label,21)
            return
        fill={'#f4f6f8':'#fafbf9'}.get(fill,fill)
        start=len(self.svg);cs=len(self.cells)
        super().box(x,y,w,h,s,kind,fill,size,bold)
        for i in range(start,len(self.svg)):self.svg[i]=self.svg[i].replace('stroke="#283238"','stroke="#87918e"').replace('stroke-width="1.7"','stroke-width="1.2"')
        for c in self.cells[cs:]:c.set('style',c.get('style').replace('strokeColor=#283238','strokeColor=#87918e').replace('strokeWidth=1.7','strokeWidth=1.2'))
        if kind=='store':self.cell('','endArrow=none;startArrow=none;strokeColor=#87918e;strokeWidth=1.2;',0,0,0,0,True,[(x+38,y),(x+38,y+h)])
    def line(self,pts,arrow=None,dashed=False,color='#596367',width=1.2):
        if self.n==2 and pts==[(1325,988),(1375,988)]:pts=[(1130,880),(1130,852),(1560,852),(1560,880)]
        color={'#17212b':'#596367','#283238':'#596367'}.get(color,color)
        st=len(self.svg);super().line(pts,arrow,dashed,color,min(width,1.5))
        for i in range(st,len(self.svg)):self.svg[i]=self.svg[i].replace('stroke-width="1.5"','stroke-width="1.2"')
    def clazz(self,x,y,w,title,attrs,methods=None,size=18):
        ah=len(attrs)*24+18;mh=(len(methods or [])*24+18) if methods else 0;h=58+ah+mh
        self.box(x,y,w,h);self.box(x,y,w,58,fill='#fafbf9')
        self.text(x+5,y+5,w-10,48,title,21,True)
        if attrs:self.text(x+10,y+66,w-20,ah-10,'\n'.join(attrs),size,align='left')
        if methods:
            self.line([(x,y+58+ah),(x+w,y+58+ah)])
            self.text(x+10,y+66+ah,w-20,mh-10,'\n'.join(methods),size,align='left')
        return h
    def finish(self,desc,note,sources):
        super().finish(desc,note,sources);render(self)

b.Diagram=Formal
class Approved(a.Architecture):
    def __init__(self,option,w,h,subtitle):
        super().__init__(option,w,h,'Inventory Management | implemented frontend, API and persistence boundaries')
        self.slug='01-System-Architecture-Diagram'
    def done(self,desc,note,sources):
        for x,y in self.ports:self.draw_port(x,y)
        self.finish(desc,note,sources);render(self)
a.Architecture=Approved

S=['japz-backend/routes/inventory.js','japz-backend/services/inventoryService.js','japz-web/src/features/inventory/Receiving.tsx']

def usecases():
    d=Formal(10,1700,1250,'UML use cases | inventory goals and implemented role permissions')
    d.box(315,155,1120,965);d.text(345,173,1060,46,'Inventory Management',25,True)
    goals=['View stock and availability','Maintain supplies and suppliers','Receive supplies / prepared stock','Manage recipes and batches','Record counts, waste and returns','Review waste reports','View history, reports and settings']
    d.actor(85,510,'Inventory Operator\nInventory / Admin')
    for i,s in enumerate(goals):
        y=245+i*116;d.box(445,y,570,75,s,kind='ellipse',size=22)
        d.line([(170,563),(445,y+37.5)])
    d.actor(1480,495,'Admin\nrole: admin')
    for y,s in [(435,'Approve / reject counts'),(620,'Reverse stock movements'),(805,'Set approval / adjustment policy')]:
        d.box(1090,y,305,90,s,kind='ellipse',size=20);d.line([(1485,548),(1395,y+45)])
    d.actor(85,176,'Cashier\nrole: cashier');d.line([(170,229),(245,229),(245,282),(445,282)])
    d.actor(1480,982,'Kitchen Staff\nrole: kitchen')
    d.box(1090,989,305,90,'Submit / view own\nwaste reports',kind='ellipse',size=20);d.line([(1485,1035),(1395,1034)])
    d.line([(1565,1035),(1650,1035),(1650,282),(1015,282)])
    d.footer('Inventory Operator groups the shared capabilities of two existing roles. Admin has additional goals; Kitchen/Cashier have limited inventory API access.')
    d.finish('Inventory Staff and Admin share the inventory operating goals shown on the left; the Admin actor also performs count review, reversals and policy control. Cashier and Kitchen appear at inventory read boundaries, and Kitchen can submit and view its own waste reports.', 'Inventory Operator is a diagram actor grouping, not an extra application role. Authentication and approved user status are preconditions. Inventory screens require Inventory/Admin; the boundary actors use their permitted API interactions.',S[:1]+['japz-backend/services/inventorySettings.js','japz-web/src/App.tsx'])

def deployment():
    d=Formal(4,1650,1070,'UML deployment | configured local development environment')
    d.asset=lambda *args,**kw:a.Architecture.asset(d,*args,**kw)
    d.box(55,164,1540,736,fill=b.LIGHT)
    d.text(83,185,1480,48,'«device» Developer workstation',25,True,'left')
    for x,title,artifact in [(100,'Web browser','Inventory UI\nReact + TypeScript'),(625,'Node.js runtime :3000','Inventory backend\nExpress + Sequelize + mysql2'),(1150,'MySQL service :3306','japz_pos schema\nInventory + shared tables')]:
        d.box(x,300,400,420,kind='node');d.text(x+16,334,340,34,'«executionEnvironment»',19)
        d.text(x+16,376,340,52,title,23,True)
        d.box(x+32,467,318,145);d.text(x+45,477,292,30,'«artifact»',18,color=b.MUTED)
        d.text(x+45,515,292,83,artifact,22)
    for logo,x in [('react.svg',205),('typescript.svg',275),('vite.svg',345),('nodejs.svg',730),('express.svg',800),('sequelize.svg',870)]:d.asset(logo,x,647,32,32)
    d.edge([(500,529),(625,529)],arrow=None);d.text(498,450,129,63,'HTTP / JSON\nBearer JWT',18)
    d.edge([(1025,529),(1150,529)],arrow=None);d.text(1021,450,130,63,'MySQL\nprotocol',18)
    d.box(100,788,1450,66,'Vite :5173 serves development source. Production builds produce static assets in japz-web/dist.',size=21)
    d.footer('Solid lines are deployment communication paths. This sheet describes source configuration, not a newly observed running or hosted environment.')
    d.finish('The deployment diagram places the inventory UI, backend code and database schema in their configured browser, Node.js and MySQL execution environments on the local workstation. Communication paths identify HTTP/JSON requests and the MySQL protocol.', 'Configured development ports are Vite 5173, Express 3000 and MySQL 3306. render.yaml supplies backend hosting configuration, but no live cloud topology, load balancer or backup service is verified.', ['start-local.ps1','japz-backend/index.js','japz-backend/models/db.js','japz-web/package.json','render.yaml'])

def packages():
    d=Formal(6,1600,1120,'UML packages | inventory source organization and package dependencies')
    for x,w,label in [(55,580,'japz-web/src'),(900,645,'japz-backend')]:
        d.box(x,164,w,829,fill=b.LIGHT);d.text(x+22,181,w-44,45,label,24,True,'left')
    def pkg(x,y,w,h,title,body):
        # Standard package folder notation: named tab and contained source elements.
        d.box(x,y,w,34,fill='#fafbf9');d.box(x,y+34,w,h-34)
        tab=min(w*.69,370)
        # Mask unused top-right tab area to preserve folder silhouette.
        d.svg[-1:]=d.svg[-1:]  # source geometry remains fully editable
        d.text(x+10,y+1,w-20,31,title,20,True,'left')
        d.text(x+18,y+50,w-36,h-65,body,21,align='left')
    # Folder silhouettes are drawn with the primitive; title sits in their tabs.
    def folder(x,y,w,h,title,body):
        d.box(x,y,w,h,kind='package')
        d.text(x+9,y+1,w*.55-18,24,title,17,True,'left')
        d.text(x+17,y+47,w-34,h-62,body,21,align='left')
    folder(85,263,520,288,'features/inventory','InventoryLayout · InventoryData\nReceiving · Supplies · Suppliers\nCountsLosses · MenuStock\nHistoryReports · Settings\nInventory screens and shared state')
    folder(85,720,520,190,'services / hooks / utils','api.ts · useAuth.tsx · requestId.ts\nHTTP requests, authentication state\nand operation identifiers')
    folder(930,263,565,165,'routes / middleware','inventory.js · access.js\nAPI handlers, reports and access checks')
    folder(930,550,565,182,'services','inventoryService · inventorySettings\nmenuAvailability · inventoryOrders\nStock rules and order stock integration')
    folder(930,845,565,135,'models','inventoryModels.js · index.js · db.js\nRecords, associations and DB connection')
    d.edge([(345,551),(345,720)],'«use»',353,620,135,dashed=True)
    d.edge([(605,810),(753,810),(753,343),(930,343)],'HTTP / JSON',765,450,145,dashed=True)
    d.edge([(1215,428),(1215,550)],'«use»',1226,467,130,dashed=True)
    d.edge([(1215,732),(1215,845)],'«use»',1226,766,130,dashed=True)
    d.edge([(1495,343),(1522,343),(1522,917),(1495,917)],dashed=True)
    d.text(1277,500,242,40,'direct model queries',18)
    d.footer('Packages map to actual source directories. Dashed dependencies point to the package used; the HTTP boundary is between applications.')
    d.finish('Frontend inventory screens depend on shared HTTP, authentication and request-ID utilities. Backend routes use inventory services and models, including direct report/history queries; services use the persistence models.', 'Grouped utility directories and route/middleware directories are logical package groupings, not new physical folders or independently deployed services.', ['japz-web/src/features/inventory','japz-web/src/services/api.ts','japz-backend/routes/inventory.js','japz-backend/services','japz-backend/models'])

def profile():
    d=Formal(8,1500,1020,'UML profile | inventory documentation stereotypes and tagged values')
    d.box(55,165,1390,735,kind='package',fill=b.LIGHT)
    d.text(82,204,1280,50,'«profile» JAPZInventoryProfile',26,True,'left')
    for y,name,tag,example,meta in [(303,'InventoryRecord','tableName: String','StockBatch → inventory_batches','Class'),(499,'InventoryService','sourceFile: String','inventoryService.js','Component'),(695,'StockOperation','transactional: Boolean','receiveStock() → true','Operation')]:
        d.box(112,y,590,150);d.box(112,y,590,54,fill='#fafbf9')
        d.text(128,y+4,558,46,'«stereotype» '+name,23,True,'left')
        d.text(130,y+65,550,32,tag,22,align='left')
        d.text(130,y+105,550,32,'Example: '+example,19,align='left',color=b.MUTED)
        d.box(1070,y+13,310,122,'«metaclass»\n'+meta,size=23)
        d.edge([(702,y+75),(1070,y+75)],'extension',751,y+24,260,arrow='extension')
    d.footer('Filled extension triangles point to UML metaclasses. Stereotypes and tags customize the documentation model; they do not add runtime functionality.')
    d.finish('JAPZInventoryProfile defines domain-specific stereotypes for inventory records, service components and stock operations. Each definition carries a tagged value and extends its corresponding UML metaclass.', 'This is a proposed documentation profile required by the activity. The application has no implemented UML profile loader or formal modeling-tool integration.', ['japz-backend/models/inventoryModels.js','japz-backend/services/inventoryService.js','OMG UML 2.5.1, Profiles'])

def components():
    d=Formal(3,1700,1120,'UML components | inventory dependencies within the existing applications')
    d.asset=lambda *args,**kw:a.Architecture.asset(d,*args,**kw)
    def component(x,y,w,h,title,desc,logo=None):
        d.box(x,y,w,h);d.box(x+w-40,y+16,23,31);d.box(x+w-46,y+20,12,7);d.box(x+w-46,y+34,12,7)
        if logo:d.asset(logo,x+22,y+25,34,34)
        d.text(x+65,y+17,w-120,43,title,22,True,'left')
        d.text(x+18,y+66,w-36,h-78,desc,20,align='left',color=b.MUTED)
    d.box(45,163,400,803,fill=b.LIGHT);d.text(65,177,360,35,'PRESENTATION',18,True,'left','#a38f55')
    component(70,265,350,140,'Inventory screens','Stock forms, tables and reports','react.svg')
    component(70,650,350,150,'Data + HTTP client','InventoryData refreshes reads; Axios sends JWT requests','typescript.svg')
    d.box(540,163,1100,803,fill=b.LIGHT);d.text(562,177,1034,35,'APPLICATION',18,True,'left','#a38f55')
    component(595,265,410,140,'Inventory router','Routes /api/inventory; runs handlers and formats responses','express.svg')
    component(1170,265,420,140,'Access middleware','Verifies JWT, approved user and permitted roles','lucide-shield-check.svg')
    component(595,650,410,150,'Inventory services','Stock transactions, recipes, availability and settings','lucide-boxes.svg')
    component(1170,650,420,150,'Sequelize models','Inventory records and shared User, MenuItem and Order','sequelize.svg')
    d.edge([(245,405),(245,650)],'«use»',255,515,130,dashed=True)
    d.edge([(420,720),(500,720),(500,335),(595,335)],'HTTP / JSON',428,445,160,dashed=True)
    d.edge([(1005,335),(1170,335)],'«use»',1010,285,145,dashed=True)
    d.edge([(800,405),(800,650)],'«use»',807,517,120,dashed=True)
    d.edge([(1005,720),(1170,720)],'«use»',1010,669,145,dashed=True)
    d.edge([(1380,405),(1380,650)],'load User',1388,515,160,dashed=True)
    d.edge([(900,265),(900,238),(1617,238),(1617,750),(1590,750)],'report / history queries',1130,211,370,dashed=True)
    d.footer('Dashed arrows point to the component used. External order integration calls inventory services for stock reservation and consumption.')
    d.finish('Inventory screens use the data provider and HTTP client to call the inventory router. The router depends on access checks, inventory services and model queries; the access middleware loads the shared User model.', 'These logical components run within one frontend and one backend. Reporting queries execute in route handlers; no separate reporting service or API gateway is implemented.',S+['japz-backend/middleware/access.js','japz-web/src/features/inventory/InventoryData.tsx'])

def activity():
    d=Formal(11,1600,1520,'UML activity | stock receiving, identity checks and atomic persistence')
    x=735
    def action(y,s):d.box(500,y,470,66,s,kind='round',size=20)
    d.dot(x,163);action(203,'Submit delivery + requestId');d.edge([(x,175),(x,203)])
    action(303,'Check actor access and requestId');d.edge([(x,269),(x,303)])
    d.box(655,407,160,85,'Valid?',kind='diamond',size=20);d.edge([(x,369),(x,407)])
    d.box(1110,414,360,66,'Return 401 / 403 / invalid ID',kind='round',size=20)
    d.edge([(815,449),(1110,449)],'[no]',875,411,150);d.dot(1290,532,True);d.edge([(1290,480),(1290,520)])
    action(535,'Begin transaction; find requestId');d.edge([(x,492),(x,535)],'[yes]',751,493,110)
    d.box(635,643,200,105,'Request\nidentity?',kind='diamond',size=20);d.edge([(x,601),(x,643)])
    d.box(1090,660,390,85,'Return saved result;\ncommit read; refresh stock',kind='round',size=21)
    d.edge([(835,695),(1090,695)],'[identical]',842,645,230);d.dot(1285,807,True);d.edge([(1285,745),(1285,795)])
    d.box(65,662,330,80,'Roll back; return 409 conflict',kind='round',size=21)
    d.edge([(635,695),(395,695)],'[actor / kind / payload conflict]',394,631,240,lh=56);d.dot(230,807,True);d.edge([(230,742),(230,795)])
    action(813,'Create operation; lock stock items');d.edge([(x,748),(x,813)],'[new]',751,753,110)
    action(920,'Validate supplier/date; create receipt');d.edge([(x,879),(x,920)])
    action(1027,'Each line: validate / convert; batch;\nbalances; movement; receipt line');d.edge([(x,986),(x,1027)])
    action(1134,'Load receipt; save result; commit');d.edge([(x,1093),(x,1134)])
    d.box(650,1244,170,85,'Write\noutcome?',kind='diamond',size=19);d.edge([(x,1200),(x,1244)])
    d.box(1070,1255,410,70,'Return receipt; refresh stock',kind='round',size=21)
    d.edge([(820,1286),(1070,1286)],'[success]',844,1241,215);d.dot(1275,1390,True);d.edge([(1275,1325),(1275,1378)])
    d.box(65,1255,350,70,'Roll back; show operation error',kind='round',size=21)
    d.edge([(650,1286),(415,1286)],'[exception]',418,1241,215);d.dot(240,1390,True);d.edge([(240,1325),(240,1378)])
    d.footer('The write outcome summarizes exceptions from any transactional action; an exception stops subsequent writes and rolls everything back.')
    d.finish('This activity models receiving access checks, request identity branches and the transaction that creates receipt records and stock changes. A new successful request commits; an identical retry returns its prior result; conflicting identities and write errors abort the attempt.', 'The outcome decision summarizes exceptions across the enclosed write sequence. Corrections begin a new submission; a failed operation does not leave partially committed inventory changes.',S)

def sequence():
    d=Formal(12,1700,1410,'UML sequence | successful new stock receiving request')
    xs=[150,485,940,1455];labels=['Inventory Staff','Receiving UI\n+ Axios','Inventory API\nrouter + services','Persistence\nSequelize + MySQL']
    for x,s in zip(xs,labels):d.box(x-135,160,270,80,s,size=21);d.line([(x,240),(x,1275)],dashed=True)
    for x,y,h in [(485,288,939),(940,350,807),(1455,412,666)]:d.box(x-7,y,14,h,fill=b.LIGHT)
    def msg(a0,b0,y,s,ret=False):d.edge([(xs[a0],y),(xs[b0],y)],s,min(xs[a0],xs[b0])+12,y-51,abs(xs[a0]-xs[b0])-24,'open' if ret else 'filled',ret,46)
    msg(0,1,290,'submit(delivery, requestId)');msg(1,2,350,'POST /api/inventory/receive + JWT')
    msg(2,3,413,'load User for API access checks');msg(3,2,472,'user status + role',True)
    msg(2,3,536,'BEGIN; find InventoryOperation');msg(3,2,595,'no existing request',True)
    msg(2,3,658,'create operation; lock items; create receipt')
    d.box(835,702,800,269,fill='none');d.line([(895,702),(895,728),(884,738),(835,738)]);d.text(839,705,50,29,'loop',17,True)
    d.text(901,706,570,32,'[each delivery line]',19,align='left')
    msg(2,3,795,'validate line; convert quantity; create batch')
    msg(2,3,866,'update balances; append receive movement')
    msg(2,3,936,'create StockReceiptLine')
    msg(2,3,1036,'load receipt; save operation result; COMMIT')
    msg(3,2,1100,'committed receipt',True);msg(2,1,1160,'JSON { receipt }',True);msg(1,0,1225,'show success; refresh reads',True)
    d.box(60,1300,1570,65,'Alternatives: identical identity replays the saved result; changed identity returns 409; any write exception rolls back.',kind='note',size=20)
    d.finish('The sequence follows one new receiving request through the browser, inventory API and persistence boundary. The loop fragment represents the actual per-line validation, conversion and stock writes before the operation result and receipt commit together.', 'Router and services share an API lifeline; Sequelize and MySQL share a persistence lifeline. Alternatives are summarized in the note and expanded as activity branches in Diagram 11.',S+['japz-backend/middleware/access.js'])

def state():
    d=Formal(13,1600,1130,'UML state machine | persisted StockCount status and Admin review')
    d.dot(125,285);d.box(305,230,140,110,'',kind='diamond')
    d.edge([(137,285),(305,285)],'valid count',136,235,155)
    d.box(620,220,330,130,'pending\nBalance unchanged',kind='round',size=24)
    d.edge([(445,285),(620,285)],'[review required]',436,231,185)
    d.box(1170,565,350,130,'applied\nCount movement saved',kind='round',size=24)
    d.edge([(375,230),(375,165),(1540,165),(1540,630),(1520,630)],'[no review required] / apply',1000,181,525)
    d.box(705,475,160,110,'',kind='diamond')
    d.edge([(785,350),(785,475)],'Admin approves',795,391,235)
    d.edge([(865,530),(1080,530),(1080,585),(1170,585)],'[version matches and count ≥ reserved]\n/ apply count movement',933,432,590,lh=63)
    d.box(620,855,330,130,'stale\nNew count required',kind='round',size=24)
    d.edge([(785,585),(785,855)],'[version changed or count < reserved]',797,746,625)
    d.box(60,855,350,130,'rejected\nBalance unchanged',kind='round',size=24)
    d.edge([(620,320),(510,320),(510,825),(235,825),(235,855)],'Admin rejects',70,772,350)
    d.footer('Initial choice is before creation. applied, rejected and stale are terminal record statuses; recounting creates a new StockCount.')
    d.finish('StockCount records begin as pending when review is required, or applied when the actor and policy permit immediate adjustment. Admin approval applies only if the item version still matches and counted stock protects reservations; otherwise the record becomes stale. Rejection leaves balances unchanged.', 'Choice diamonds are UML pseudostates, not additional database status values. Invalid input is rejected before creation. Review policy depends on role, countApproval and the item adjustmentLimit.',S[:2]+['japz-backend/models/inventoryModels.js'])

def communication():
    d=Formal(14,1700,1110,'UML communication | receiving collaboration and numbered messages')
    for x,y,w,s in [(60,255,340,'staff : InventoryStaff'),(600,255,390,'ui : ReceivingUI'),(1190,255,440,'api : InventoryAPI'),(1190,775,440,'db : SequelizePersistence')]:
        d.box(x,y,w,110);d.text(x+10,y+22,w-20,65,s,23,underline=True)
    d.line([(400,310),(600,310)]);d.line([(990,310),(1190,310)]);d.line([(1410,365),(1410,775)])
    d.edge([(420,292),(580,292)],'1: submit delivery',398,242,200)
    d.edge([(1010,292),(1170,292)],'1.1: POST /receive',986,221,210)
    d.edge([(1170,339),(1010,339)],'1.2: JSON receipt',985,378,215,dashed=True)
    d.edge([(1388,402),(1388,732)],arrow='open')
    d.text(685,452,670,260,'1.1.1: load approved User; check role\n1.1.2: BEGIN; find request identity\n1.1.3: create operation; lock items; receipt\n1.1.4*: validate / convert; batch; balances; movement; line\n1.1.5: load receipt; save result; COMMIT',21,align='left')
    d.edge([(1435,732),(1435,402)],arrow='open',dashed=True)
    d.text(1450,480,195,120,'Replies:\nuser, lookup\nand receipt',20)
    d.box(65,775,820,145,'API denotes the existing router, middleware and stock services.\n* Repeats for each delivery line.\nMessage numbering carries order; solid lines show object links.',kind='note',size=22)
    d.footer('The communication and sequence diagrams model the same successful new request; replay and rollback are alternatives in Diagram 11.')
    d.finish('This communication diagram shows the actor, receiving UI, inventory API and persistence objects collaborating on a stock receipt. Nested message numbers describe authorization, transaction identity handling, repeated line writes and commit along the API-to-persistence link.', 'The inventory API groups existing middleware, route handlers and services for readability; it is not an added runtime class. Return messages are dashed, and repeated line messages use the UML iteration marker.',S)

if __name__=='__main__':
    funcs=[a.structured,b.classes,components,deployment,b.objects,packages,b.composite,profile,b.dfd,usecases,activity,sequence,state,communication,b.overview,b.timing,b.requirements]
    for f in funcs:f();print(f.__name__,flush=True)
    mx=ET.Element('mxfile',host='app.diagrams.net',version='24.7.17')
    for d in b.ALL:mx.append(d)
    ET.ElementTree(mx).write(ROOT/'editable/JAPZ-Inventory-All-17-Diagrams.drawio',encoding='utf-8',xml_declaration=True)
    (ROOT/'_work/manifest.json').write_text(json.dumps(b.META,indent=2),encoding='utf-8')
    (ROOT/'_work/layout-checks.json').write_text(json.dumps(b.CHECKS,indent=2),encoding='utf-8')
    print('Layout checks:',json.dumps(b.CHECKS),flush=True)
