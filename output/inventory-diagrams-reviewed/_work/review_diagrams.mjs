import fs from 'node:fs/promises';
const ROOT='C:/Users/ASUS/Desktop/Japz/output/inventory-diagrams-reviewed';
const previous=JSON.parse((await fs.readFile('C:/Users/ASUS/Desktop/Japz/output/inventory-diagrams-teacher-format/_work/diagrams.json','utf8')).replace(/^\uFEFF/,''));
const diagrams=new Map(previous.map(d=>[d.n,structuredClone(d)]));
class D {
 constructor(n,h=1000,w=900){this.n=n;this.name=diagrams.get(n).name;this.caption=diagrams.get(n).caption;this.w=w;this.h=h;this.ops=[];diagrams.set(n,this);}
 text(x,y,w,h,s,size=23,bold=false,align='center'){this.ops.push({kind:'text',x,y,w,h,s,size,bold,align});return this;}
 box(x,y,w,h,s='',kind='rect',size=23){this.ops.push({kind,x,y,w,h});if(s)this.text(x+10,y+7,w-20,h-14,s,size);return this;}
 line(points,arrow='',dash=false){this.ops.push({kind:'line',points,arrow,dash});return this;}
 edge(points,s='',x=0,y=0,w=180,arrow='open',dash=false){this.line(points,arrow,dash);if(s)this.text(x,y,w,Math.max(34,s.split('\n').length*29),s,20);return this;}
 klass(x,y,w,title,attrs){let head=title.includes('\n')?78:50;let h=head+attrs.length*31+12;this.box(x,y,w,h);this.text(x+5,y+4,w-10,head-10,title,23,true);this.line([[x,y+head],[x+w,y+head]]);this.text(x+10,y+head+7,w-20,h-head-14,attrs.join('\n'),21,false,'left');return h;}
 actor(x,y,s){this.box(x+25,y,34,34,'','ellipse');this.line([[x+42,y+34],[x+42,y+95]]);this.line([[x+5,y+57],[x+79,y+57]]);this.line([[x+42,y+95],[x+9,y+137]]);this.line([[x+42,y+95],[x+75,y+137]]);this.text(x-45,y+143,175,68,s,22);}
 dot(x,y,final=false){this.ops.push({kind:'dot',x,y,final});return this;}
 frame(label){let old=this.ops;this.ops=[];this.box(5,5,this.w-10,this.h-10);this.box(5,5,Math.min(740,label.length*13+50),43);this.text(18,7,Math.min(710,label.length*13+25),37,label,23,true,'left');this.ops.push(...old);}
}
function group(d,x,y,w,h,title){d.box(x,y,w,h);d.text(x+10,y+6,w-20,40,title,24,true);}
function edit(n,fn){let d=diagrams.get(n);Object.setPrototypeOf(d,D.prototype);fn(d);d.change='Targeted correction; original layout retained.';return d;}
let d;
// Figure 1 uses the NEW GitDiagram component inventory, regrouped into real execution boundaries.
d=new D(1,1130,1000);d.change='Replace old architecture with the verified NEW GitDiagram baseline.';
d.box(230,10,540,52,'Inventory Staff / Admin');d.edge([[500,62],[500,105]],'uses web UI',525,66,210,'filled');
group(d,20,105,960,305,'Browser: Inventory Web (React / TypeScript / Vite)');
d.box(50,166,260,70,'App.tsx: routes\nInventoryLayout', 'rect',22);
d.box(370,166,260,70,'Login / useAuth.tsx\nSign-in context','rect',22);
d.box(690,166,260,70,'ProtectedRoute.tsx\nUI guard','rect',22);
d.box(50,275,260,74,'Inventory screens\nMenuStock / controls','rect',22);
d.box(370,275,260,74,'InventoryData.tsx\ndata.ts / refresh','rect',22);
d.box(690,275,260,74,'api.ts / Axios\nJWT / HTTP JSON','rect',22);
d.edge([[180,236],[180,275]],'',0,0,0,'filled');d.edge([[310,305],[370,305]],'uses',313,265,58,'filled');
d.edge([[630,305],[690,305]],'calls',632,265,57,'filled');d.edge([[690,205],[630,205]],'',0,0,0,'open',true);
d.edge([[500,226],[500,245],[820,245],[820,275]],'auth API',520,244,145,'filled');
d.text(40,353,920,43,'CSV export, display alerts and automatic refresh run in the browser.',22);
d.edge([[820,410],[820,465]],'HTTP / JSON + JWT',550,418,260,'filled');
group(d,20,465,960,227,'Node.js / Express: API and Identity');
d.box(50,527,260,74,'index.js / shared routes\nExpress runtime','rect',22);
d.box(370,527,260,74,'inventory.js\n/api/inventory','rect',22);
d.box(690,527,260,74,'access.js\nJWT / status / roles','rect',22);
d.edge([[310,557],[370,557]],'',0,0,0,'filled');d.edge([[630,557],[690,557]],'',0,0,0,'filled');
d.box(370,625,260,45,'User: shared identity','rect',22);d.edge([[820,601],[820,647],[630,647]],'reloads user',653,603,170,'filled');
group(d,20,740,960,165,'Inventory Domain: existing service modules');
const serviceBoxes=[['inventoryService.js','Stock operations'],['menuAvailability.js','Recipes / cart checks'],['inventorySettings.js','Policies / versions'],['inventoryOrders.js','Order stock lifecycle']];
serviceBoxes.forEach(([a,b],i)=>d.box(40+i*240,802,220,78,a+'\n'+b,'rect',21));
d.edge([[500,692],[500,740]],'dispatches Inventory work',510,697,360,'filled');
d.box(40,420,400,40,'Cashier / Kitchen: direct boundaries','rect',19);d.edge([[180,460],[180,527]],'',0,0,0,'filled');
d.edge([[180,692],[180,724],[875,724],[875,802]],'order lifecycle',250,696,200,'filled');
group(d,20,955,960,157,'Persistence: Sequelize ORM and MySQL');
d.box(40,1013,300,73,'inventoryModels.js\n12 Inventory record types','rect',22);
d.box(365,1013,300,73,'Shared models\nMenu / order / payment','rect',22);
d.box(690,1013,260,73,'db.js (Sequelize)\nModels / associations','rect',22);
d.edge([[500,905],[500,955]],'models / transactions',515,909,330,'filled');
d.text(30,1090,940,25,'MySQL: japz_pos in the main project; schema-only extraction uses its own database.',20);

// Existing class diagram: add the two omitted item associations, keeping the six-class view.
edit(2,d=>{
 d.w=1000;
 d.line([[525,145],[445,145],[445,690],[375,690]]);d.text(462,151,55,32,'1',20);d.text(381,647,62,32,'0..*',20);
 d.line([[855,160],[955,160],[955,632],[855,632]]);d.text(861,174,70,32,'0..1',20);d.text(862,647,70,32,'0..*',20);
 d.ops.find(o=>o.kind==='text'&&o.s.startsWith('Other inventory records:')).s='Supporting records: StockCount, WasteReport, MenuRecipe,\nStockAllocation, InventorySettings and InventoryOperation.\nPrepared movements use MenuItem; StockMovement.stockItemId is optional.';
});

// Correct component boundaries rather than the previous UI-to-Access shortcut.
d=new D(3,1000);d.change='Correct component boundaries, dependencies and client-side exports.';
group(d,35,40,830,890,'JAPZ Inventory: logical software components');
d.box(100,115,700,105,'«component» Inventory Web\nScreens + InventoryData + HTTP client\nCSV export / refresh / display alerts','rect',23);
d.box(100,315,700,100,'«component» Inventory API\nroutes/inventory.js + shared routes/index.js','rect',23);
d.edge([[450,220],[450,315]],'JSON API',470,246,180,'open',true);
d.box(60,515,350,130,'«component» Access middleware\nJWT authentication\nApproved-user / role checks','rect',23);
d.box(490,515,350,130,'«component» Domain services\nStock / recipes / settings\nOrder inventory lifecycle','rect',23);
d.edge([[265,415],[265,515]],'«use»',280,445,130,'open',true);d.edge([[660,415],[660,515]],'«use»',675,445,130,'open',true);
d.box(100,775,700,115,'«component» Sequelize persistence\nInventory + directly shared models\nAssociations / db.js connection','rect',23);
d.edge([[235,645],[235,775]],'User model',245,697,190,'open',true);d.edge([[665,645],[665,775]],'models / transactions',420,696,230,'open',true);
d.text(70,936,760,44,'Dependency arrows point to the component used; these are logical modules.',21);

d=new D(4,1040);d.change='Keep local deployment scope; connect Browser independently to Vite and Express.';
group(d,90,40,720,230,'«device» Local workstation (configured development setup)');
d.box(115,110,670,125,'«executionEnvironment» Browser\n«artifact» Inventory React application','node',25);
group(d,65,365,770,365,'«device» Local development host');
d.box(100,450,320,220,'«executionEnvironment»\nVite :5173\n«artifact» Frontend assets','node',24);
d.box(480,450,320,220,'«executionEnvironment»\nNode.js / Express :3000\n«artifact» Inventory API','node',24);
d.edge([[280,270],[280,365]],'HTTP: frontend assets',30,291,365,'');d.edge([[640,270],[640,365]],'HTTP / JSON: API calls',497,291,320,'');
d.box(240,835,420,150,'«executionEnvironment» MySQL :3306\n«artifact» japz_pos schema','node',25);
d.edge([[640,730],[640,785],[450,785],[450,835]],'MySQL protocol / SQL\nvia Sequelize',655,730,205,'');
d.text(50,995,800,35,'Nodes may share one physical computer; no production topology is asserted.',21);

edit(5,d=>{
 d.h=830;
 const line=d.ops.find(o=>o.kind==='text'&&o.s.startsWith('receiptId = 20; batchId = 30'));
 if(line){line.s='receiptId = 20; batchId = 30\nstockItemId = 10; purchaseQuantity = 5\npurchaseUnit = kg; conversion = 1000\nquantity = 5000 g';line.size=20;}
 d.line([[525,150],[450,150],[450,700],[375,700]]);
 d.text(35,772,830,45,'Illustrative objects only: IDs, supplier and quantities are not live business data.',21);
});

d=new D(6,1030);d.change='Use actual source-folder names and real import dependencies; MySQL is not a source package.';
group(d,35,40,830,930,'Inventory source packages (logical folder view)');
d.box(65,130,350,145,'«package» features/inventory\nScreens / shared controls\nInventoryData.tsx + data.ts','package',22);
d.box(500,130,335,145,'«package» client support\nhooks / components / utils\nservices/api.ts','package',22);
d.edge([[415,210],[500,210]],'«use»',420,168,77,'open',true);
d.box(65,415,350,135,'«package» routes\ninventory.js / index.js','package',23);
d.box(500,415,335,135,'«package» middleware\naccess.js','package',23);
d.edge([[650,275],[650,338],[240,338],[240,415]],'HTTP JSON contract',278,292,320,'open',true);
d.edge([[415,490],[500,490]],'«use»',420,449,75,'open',true);
d.box(65,665,350,150,'«package» services\ninventoryService / inventoryOrders\nmenuAvailability / inventorySettings','package',21);
d.box(500,665,335,150,'«package» models\ninventoryModels + shared models\nindex.js associations / db.js','package',21);
d.edge([[240,550],[240,665]],'«use»',250,588,130,'open',true);d.edge([[415,740],[500,740]],'«use»',420,699,75,'open',true);
d.edge([[665,550],[665,665]],'User model',680,587,130,'open',true);
d.text(60,867,780,76,'All backend models use db.js (Sequelize). MySQL is the persistence service,\nnot a JavaScript package or an independent Inventory application module.',22);

// Figure 7 is already a valid scoped composite collaboration. Its image is retained byte-for-byte.
edit(7,d=>{d.change='Retain original diagram image; clarify that parts model the receiving collaboration.';d.preserveImage=true;});

d=new D(8,990);d.change='Replace incorrect stereotype-to-enumeration links with UML metaclass extensions.';
d.box(25,35,850,870,'','package');d.text(45,61,810,42,'«profile» JAPZInventoryProfile',26,true);
d.text(45,109,810,40,'Documentation convention only; not an implemented runtime profile engine.',21);
const positions=[45,335,625];const stereotypes=[['InventoryRecord',['unit : BaseUnit','auditFields : Boolean'],'Class'],['StockService',['responsibility : String','module = "inventory"'],'Component'],['StockOperation',['action : StockAction','changesBalance : Boolean'],'Operation']];
stereotypes.forEach(([name,attrs,meta],i)=>{
 const x=positions[i];d.klass(x,215,230,'«stereotype»\n'+name,attrs);d.ops.at(-1).size=18;d.box(x,485,230,92,'«metaclass»\n'+meta,'rect',24);
 d.edge([[x+115,367],[x+115,485]],'',0,0,0,'triangle');
});
d.box(45,690,230,165,'«enumeration» BaseUnit\ng\nml\npcs','rect',21);
d.box(310,665,300,215,'«enumeration» StockAction\nopening / receive / reserve\nconsume / release / waste\ncount / supplier_return\nreversal / hold / unhold','rect',20);
d.box(625,690,230,160,'«constraint»\nNo negative stock\nProtect reservations\nAppend movement history','note',22);
d.text(45,919,810,57,'Filled extension triangles target UML metaclasses. Enumerations type the tags;\nthey are not extended metaclasses. Constraints summarize service rules.',21);

d=new D(9,1050,1000);d.change='Complete labelled Inventory data flows and direct POS/Kitchen boundaries; no control-flow arrows.';
function process(x,y,w,h,number,label){d.box(x,y,w,h,'','round');d.line([[x,y+30],[x+w,y+30]]);d.text(x+5,y+1,w-10,28,number,21,true);d.text(x+10,y+35,w-20,h-43,label,23);}
d.box(35,35,350,65,'Inventory Staff / Admin');d.box(515,35,350,65,'Cashier / Kitchen boundaries');
process(35,190,350,108,'1.0','Maintain supplies, recipes\nand Inventory settings');
process(515,190,350,108,'2.0','Receive / count / loss\nReview counts and waste');
d.edge([[210,100],[210,190]],'details / policy changes',30,117,325,'filled');d.edge([[385,65],[450,65],[450,220],[515,220]],'stock entries\nreview decisions',461,111,205,'filled');
d.edge([[690,100],[690,190]],'waste reports',705,125,160,'filled');
function store(x,y,w,h,id,body){d.box(x,y,w,h,'','store');d.text(x+2,y+2,36,h-4,id,20);d.text(x+51,y+7,w-61,h-14,body,21);}
store(35,390,350,95,'D1','Items / menu / suppliers\nRecipes / settings');
store(515,390,350,95,'D2','Receipts / batches\nCounts / waste / operations');
d.edge([[210,298],[210,390]],'master updates',45,320,310,'filled');d.edge([[690,298],[690,390]],'receipt / count / waste data',525,319,350,'filled');
d.edge([[515,260],[450,260],[450,425],[385,425]],'balances / versions',385,310,190,'filled');
d.edge([[385,459],[425,459],[425,360],[735,360],[735,298]],'units / policies',450,352,210,'filled');
process(515,560,350,108,'3.0','Reserve / consume / release\nOrder inventory allocation');
d.edge([[865,65],[955,65],[955,590],[865,590]],'orders /\nstatus',875,300,110,'filled');
d.edge([[690,485],[690,560]],'usable batches',531,499,155,'filled');
d.edge([[795,560],[795,485]],'batch deltas',800,507,170,'filled');
d.edge([[385,475],[465,475],[465,590],[515,590]],'recipe / menu data',275,519,230,'filled');d.ops.at(-1).background=true;
d.edge([[515,651],[410,651],[410,480],[385,480]],'balance\nupdates',385,572,120,'filled');d.ops.at(-1).background=true;
store(35,560,350,108,'D3','Stock movements\nActor / reason / deltas\nAllocations');
d.edge([[560,298],[485,298],[485,607],[385,607]],'movement entries',292,496,215,'filled');
d.edge([[515,623],[385,623]],'allocation / movements',365,638,260,'filled');
process(235,785,430,112,'4.0','View balances, availability\nHistory / reports');
d.edge([[210,485],[210,510],[15,510],[15,745],[300,745],[300,785]],'stock / recipes',35,706,225,'filled');
d.edge([[690,668],[690,745],[600,745],[600,785]],'allocations / batches',635,715,235,'filled');
d.edge([[210,668],[210,710],[400,710],[400,785]],'movement history',250,712,220,'filled');
d.box(235,965,430,55,'Inventory Staff / Admin');d.edge([[450,897],[450,965]],'views / CSV data',475,908,230,'filled');
d.text(35,1021,830,26,'DFD Level 1: arrows carry named data. CSV files are produced by the frontend.',20);

d=new D(10,1120);d.change='Correct role boundaries and conditional use-case extensions; add Admin and Kitchen.';
d.box(170,45,705,990);d.text(185,57,675,42,'JAPZ Inventory Management',25,true);
d.actor(15,140,'Inventory\nStaff');d.actor(15,600,'Admin');
const goals=[['View stock / history / reports',125],['Maintain supplies / suppliers',235],['Receive supplies / prepared stock',345],['Manage recipes / batch holds',455],['Record count / waste / return',565],['Review Kitchen waste reports',675],['Edit alert / refresh settings',785]];
goals.forEach(([s,y])=>{d.box(250,y,555,65,s,'ellipse',23);d.line([[82,231],[180,231],[250,y+32]]);});
d.line([[82,700],[180,700],[250,785+32]]);
d.box(250,895,555,65,'Approve counts / reverse movements\nSet approval and reorder policies','ellipse',21);d.line([[82,700],[180,700],[180,927],[250,927]]);
d.text(190,985,655,42,'Admin can also perform Inventory Staff use cases.',22);
d.text(25,1048,850,64,'Kitchen boundary: submit waste reports. Cashier / Kitchen may read availability.\nReceive includes validation and unit conversion; CSV export is optional.',22);
// Actor associations are retained as such; the approval dependency is documented rather than a false Staff permission.

d=new D(11,1120);d.change='Keep stock-vs-report workflow; add explicit validation-failure, transaction and merge paths.';
d.dot(450,25);d.box(275,65,350,65,'Open Inventory workspace','round',24);d.edge([[450,35],[450,65]],'',0,0,0,'filled');
d.box(245,185,410,70,'Authenticate approved user\nCheck requested role/action','round',23);d.edge([[450,130],[450,185]],'',0,0,0,'filled');
d.box(315,300,270,95,'Authorized?','diamond',23);d.edge([[450,255],[450,300]],'',0,0,0,'filled');
d.box(690,308,175,80,'Display\naccess denied','round',22);d.edge([[585,347],[690,347]],'[no]',595,301,85,'filled');
d.box(315,460,270,90,'Select function','diamond',23);d.edge([[450,395],[450,460]],'[yes]',460,410,100,'filled');
d.box(35,620,380,78,'Receive / count / waste / return\nValidate input and stock state','round',22);
d.box(500,620,365,78,'Read balances / history / reports\nApply selected filters','round',22);
d.edge([[315,505],[225,505],[225,620]],'[stock change]',25,551,240,'filled');d.edge([[585,505],[680,505],[680,620]],'[view / report]',611,551,250,'filled');
d.box(75,755,280,80,'Valid?','diamond',23);d.edge([[225,698],[225,755]],'',0,0,0,'filled');
d.box(35,885,380,82,'Commit related writes atomically\nor record pending count','round',22);d.edge([[215,835],[215,885]],'[yes]',220,845,100,'filled');
d.box(500,885,365,82,'Display results\nOptional browser CSV export','round',22);d.edge([[680,698],[875,698],[875,869],[680,869],[680,885]],'',0,0,0,'filled');
d.box(425,758,430,64,'[invalid / failed write]\nRoll back; show error; correct input','round',21);d.edge([[355,795],[425,795]],'[no]',358,747,66,'filled');
d.edge([[640,758],[640,730],[225,730],[225,698]],'retry with corrected input',274,700,330,'filled');
d.box(420,1010,60,44,'','diamond');d.edge([[215,967],[215,1032],[420,1032]],'',0,0,0,'filled');d.edge([[680,967],[680,1032],[480,1032]],'',0,0,0,'filled');
d.edge([[865,347],[890,347],[890,1080],[465,1080]],'',0,0,0,'filled');d.dot(450,1080,true);d.edge([[450,1054],[450,1068]],'refresh / leave',475,1042,220,'filled');

d=new D(12,1170);d.change='Use proper lifelines/combined fragments; put auth, transaction, replay checks and receipt creation in implementation order.';
d.frame('sd  Receive Inventory Stock');
const xs=[90,300,540,805];const labels=['Inventory\nStaff','Receiving.tsx\nUI','API / service\nStock logic','ORM / MySQL'];
xs.forEach((x,i)=>{d.box(x-75,78,150,78,labels[i],'rect',21);d.line([[x,156],[x,1100]],'',true);});
function msg(a,b,y,s,ret=false){const h=s.split('\n').length*26;d.line([[xs[a],y],[xs[b],y]],ret?'open':'filled',ret);d.text(Math.min(xs[a],xs[b])+8,y-h-8,Math.abs(xs[b]-xs[a])-16,h,s,19);}
msg(0,1,210,'1: enter delivery');msg(1,2,285,'2: POST receive\nrequestId + lines');
d.text(35,315,435,62,'Authorize JWT / approved user / role\nValidate requestId + payload fingerprint',19);d.ops.at(-1).background=true;
msg(2,3,400,'3: begin transaction\nfind / lock operation');
d.box(470,455,407,590);d.box(470,455,85,36);d.text(472,457,81,32,'alt',20);
d.text(567,456,297,37,'[matching saved operation]',20,true);msg(3,2,550,'4a: saved result',true);
d.line([[470,585],[877,585]],'',true);d.text(480,591,385,32,'[new request; writes succeed]',20,true);
msg(2,3,678,'4b: operation + item locks\ncreate ONE receipt');
d.box(485,715,376,162);d.box(485,715,72,32);d.text(487,717,68,28,'loop',19);d.text(565,716,287,30,'[each delivery line]',20,true);
msg(2,3,829,'5*: validate / convert line\nwrite stock / batch / line');
msg(2,3,932,'6: store result; commit');
d.line([[470,950],[877,950]],'',true);d.text(478,955,390,75,'[mismatched request / invalid line / write failure]\nRollback transaction; return conflict or error',19);
msg(2,1,1080,'7: saved receipt / error',true);d.text(146,1110,635,42,'8: UI refreshes stock and receipt history after a successful response.',21);

edit(13,d=>{
 for(const o of d.ops.filter(o=>o.kind==='text')){
  if(o.s==='Yes')o.s='[yes]';
  if(o.s==='Review still\nvalid?')o.s='Review valid?';
  if(o.s==='Admin rejects')o.s='reject';
  if(o.s==='Yes / approve')o.s='[valid] / apply';
  if(o.s==='No')o.s='[stale]';
  if(o.s==='[No review required] / apply')o.s='[approval not required] / apply';
 }
 d.text(480,437,280,45,'approve (Admin)',20);
 d.text(25,843,850,62,'Only valid submissions create a count. Initial version/reservation failures\nreturn an error; only a pending count can become stale during Admin approval.',21);
});

d=new D(14,1000);d.change='Correct numbered collaboration messages, separate access middleware and show transaction identity/line writes.';
d.frame('sd  Stock Receiving (communication view)');
d.klass(35,95,350,': InventoryStaff',['delivery data']);d.klass(515,95,350,'ui : ReceivingInterface',['requestId / line inputs']);
d.klass(515,350,350,'api : InventoryRouter',['/api/inventory/receive']);d.klass(35,350,350,'access : Middleware',['JWT / approved User / role']);
d.klass(515,620,350,'service : InventoryService',['receiveStock / inventoryOperation']);d.klass(35,620,350,'db : Sequelize / MySQL',['receipt / batches / movements']);
d.edge([[385,158],[515,158]],'1: submit',388,111,124,'filled');
d.edge([[690,188],[690,350]],'1.1: POST receive',520,271,325,'filled');
d.edge([[515,410],[385,410]],'1.1.1: authenticate / authorize',87,465,720,'filled');
d.edge([[690,443],[690,620]],'1.1.2: receiveStock',505,535,350,'filled');
d.edge([[515,686],[385,686]],'1.1.2.1: transaction / replay check\n1.1.2.2*: line writes; save result; commit',47,760,807,'filled');
d.edge([[385,705],[515,705]],'1.1.2.3: receipt result',55,830,790,'open',true);
d.text(30,917,840,61,'Replies return along the same links. * denotes repetition per delivery line.\nThe middleware check completes before the protected route calls the service.',21);

d=new D(15,1030);d.change='Use interaction-use ref frames, guards and a real receiving-success decision instead of miniature lifelines inside ref boxes.';
d.frame('Inventory Receiving Interactions');d.dot(450,85);d.box(230,125,440,70,'Open Inventory workspace','round',24);d.edge([[450,95],[450,125]],'',0,0,0,'filled');
function ref(x,y,w,h,label){d.box(x,y,w,h);d.box(x,y,65,30);d.text(x+2,y+2,61,26,'ref',20);d.text(x+15,y+34,w-30,h-39,label,24);}
ref(120,260,660,100,'Authenticate and authorize\nJWT / approved user / requested role');d.edge([[450,195],[450,260]],'',0,0,0,'filled');
d.box(315,420,270,85,'Authorized?','diamond',23);d.edge([[450,360],[450,420]],'',0,0,0,'filled');
d.box(680,420,190,80,'Show denied\naccess','round',22);d.edge([[585,462],[680,462]],'[no]',590,421,89,'filled');d.dot(775,570,true);d.edge([[775,500],[775,558]],'',0,0,0,'filled');
ref(120,585,660,110,'Receive Inventory Stock (Figure 12)\nTransactional receiving / idempotent result');d.edge([[450,505],[450,585]],'[yes]',465,529,100,'filled');
d.box(330,745,240,78,'Saved result?','diamond',23);d.edge([[450,695],[450,745]],'',0,0,0,'filled');
d.box(675,752,205,82,'Show error\nCorrect / retry','round',22);d.edge([[570,784],[675,784]],'[no]',573,745,94,'filled');
ref(120,884,530,78,'Refresh stock and receipt history');d.edge([[450,823],[450,884]],'[yes]',465,840,95,'filled');
d.dot(450,1000,true);d.edge([[450,962],[450,988]],'',0,0,0,'filled');d.edge([[775,834],[775,1000],[465,1000]],'[leave]',675,934,95,'filled');d.edge([[880,790],[890,790],[890,650],[780,650]],'[retry]',781,694,108,'filled');

edit(16,d=>{
 const footer=d.ops.find(o=>o.kind==='text'&&o.s.startsWith('Times model the order'));
 footer.s='High level = active; low level = idle. The 0-4 s scale is illustrative,\nnot a benchmark or response-time requirement.';footer.h=65;footer.size=21;
 const title=d.ops.find(o=>o.kind==='text'&&o.s.startsWith('Receive Stock: illustrative'));title.s='Receive Stock: illustrative participant activity timing';
});

d=new D(17,1110);d.change='Retain five derived requirements; correct Id/Text properties, direct stock permission wording, and satisfying implementation artifacts.';
d.klass(185,30,530,'«requirement» Inventory Management',['id = "INV-00"','text = "Accurate, controlled stock operations."']);
const reqs=[['INV-01','Access Control','Direct stock writes require an approved\nInventory/Admin role; count review is Admin-only.','middleware/access.js\nroutes/inventory.js'],['INV-02','Reliable Receiving','Commit receipt and balance records atomically;\nmatching retries return the saved result.','inventoryService.js\nreceiveStock / inventoryOperation'],['INV-03','Safe Availability','Exclude expired/held stock for allocation;\nprotect reserved quantities.','menuAvailability.js\ninventoryOrders.js'],['INV-04','Controlled Counts','Validate versions and reservations;\napply configured approval policy.','inventoryService.js\ncountStock / reviewCount'],['INV-05','Traceable History','Append movements with deltas, actor, reason;\ncorrections add records rather than erase them.','inventoryService.js\ninventoryModels.js']];
reqs.forEach(([id,name,text,artifact],i)=>{
 const y=285+i*156;d.box(30,y,520,132);d.text(40,y+5,500,33,'«requirement» '+name,23,true);d.line([[30,y+42],[550,y+42]]);
 d.text(43,y+49,495,78,'id = "'+id+'"\ntext = "'+text+'"',20,false,'left');
 d.box(675,y+9,200,113,'«artifact»\n'+artifact,'rect',19);
 d.edge([[675,y+66],[550,y+66]],'«satisfy»',553,y+11,120,'open',true);
 d.line([[30,y+66],[12,y+66],[12,228],[450,228],[450,173]],'open',true);
});d.text(205,184,510,35,'«deriveReqt» points toward INV-00',21);
d.text(35,1070,830,30,'Requirements are inferred from implemented rules; links identify code responsibility.',20);

// Descriptions preserve the user's two-paragraph rhythm without a fixed sentence count.
const prose={
1:[`Figure 1 replaces the earlier architecture with a verified version of the new GitDiagram architecture. App.tsx and InventoryLayout organize the Inventory routes inside the browser. Login and useAuth provide shared sign-in state, while ProtectedRoute checks frontend access. Inventory screens use InventoryData.tsx and data.ts for shared records and refresh helpers, then call the Axios client in api.ts. CSV downloads, visible stock alerts and refresh timers are browser responsibilities.`, `The Express runtime mounts shared routes and /api/inventory. Server middleware verifies the JWT, reloads an approved User and enforces the requested role. Stock, availability, settings and order-inventory services use Sequelize models and transactions to access MySQL. Cashier order creation and Kitchen status/waste requests are direct module boundaries, not independent services added to Inventory. Shared user, menu, order and payment records remain necessary because the original system is a modular monolith.`],
2:[`Figure 2 retains the core receiving class view and corrects its missing item associations. Supplier can be associated with many StockItem and StockReceipt records; the supplier reference is optional. Each StockBatch belongs to one StockItem. A successfully recorded receipt contains one to 100 lines, and every StockReceiptLine identifies one receipt, one stock item and one batch. Its conversion and quantity fields retain the purchased and base-unit amounts.`, `StockMovement records an action, quantity, reason and on-hand/reserved deltas. Its stock-item and batch references are optional because prepared-stock movements use the shared MenuItem instead. The diagram shows associations rather than unsupported lifecycle composition. Its receipt-line minimum describes the receiving workflow, not a separate SQL minimum-cardinality constraint. Counts, waste reports, recipes, allocations, settings and operation identity records are named as supporting models; they are not fictitious classes or methods.`],
3:[`Figure 3 separates the Inventory web component, API routing, access middleware, domain services and Sequelize persistence. Dependency arrows point toward the component used. The frontend reaches backend functions through the JSON API; it does not bypass routing by calling an authorization component or the database directly. Authentication is enforced on the server as well as through the frontend route guard.`, `The domain service group contains the existing stock, recipe/availability, settings and order-inventory modules. Access middleware depends on the shared User model, while domain services depend on Inventory and directly shared persistence models. The web component performs CSV formatting, refresh scheduling and alert display. These are logical components of the implemented application, not separately deployed servers or newly introduced interfaces.`],
4:[`Figure 4 preserves the configured local-development view while correcting the communication paths. The browser obtains React assets from Vite on port 5173 and sends Inventory HTTP/JSON calls to the Express API on port 3000. These are separate connections even when all execution environments are on one physical workstation. Vite serves and updates the frontend; Express performs protected backend operations.`, `Only the backend accesses MySQL through Sequelize and the MySQL driver. Port 3306 and the japz_pos schema describe the main project's local configuration. The separate GitDiagram repository is an extraction with its own configurable database name; that does not change the main system's deployment. No live cloud topology, production host, load balancer or backup service is implied by this diagram.`],
5:[`Figure 5 preserves the sample flour-receiving snapshot and adds the omitted StockReceiptLine-to-StockItem link. The illustrative line identifies receipt 20, item 10 and batch 30. Five kilograms multiplied by the configured conversion of 1,000 grams per kilogram produces a received quantity of 5,000 grams. The related item and batch therefore show the same on-hand quantity with no reservation in this example.`, `The receiving movement records a positive 5,000-gram change and links to the batch. Underlined object headings distinguish instances from the classes in Figure 2. The supplier, identifiers, receipt reference and quantities are illustrative teaching values, not a database export or verified business delivery. The snapshot is intentionally limited to one successful receipt line and does not imply that all receipts contain only one item.`],
6:[`Figure 6 organizes the implementation by its real source responsibilities. The features/inventory package contains screens, shared controls, InventoryData and data helpers. Client support represents the shared hooks, protected-route component, request-ID utility and Axios transport. Its connection to backend routes represents an HTTP contract rather than a JavaScript import across the browser/server boundary.`, `The backend routes use access middleware and domain services. Middleware reads User records, while Inventory services use stock and directly shared models through the models package. models/index.js registers associations and db.js supplies the Sequelize connection. MySQL is an external persistence service, not a source-code package. These package dependencies describe code organization without asserting separate deployment units.`],
7:[`Figure 7 retains the existing composite structure because its receiving collaboration is consistent with the implementation. The HTTP port delegates a request through authentication and role checks to the protected Inventory handler. The stock-service part collaborates with model access, and the persistence port marks the database boundary. The connectors describe cooperation inside one API boundary.`, `The named parts are a documentation-level view of access.js, routes/inventory.js, inventoryService.js and Sequelize model access. They do not introduce a new InventoryAPI class or claim that the JavaScript modules are constructed as runtime objects. This figure is scoped to the stock-receiving path; other availability, settings and order-allocation collaborations are shown in the architecture and component views.`],
8:[`Figure 8 corrects the UML profile notation while retaining the Inventory-specific documentation purpose. InventoryRecord extends the Class metaclass, StockService extends Component, and StockOperation extends Operation. Each extension uses a solid line with a filled triangle directed at the UML metaclass. The BaseUnit and StockAction enumerations type stereotype properties; they are not targets of metaclass extensions.`, `The base-unit values match g, ml and pcs. StockAction now includes the movement actions defined by the model, including opening, reversal, hold and unhold. The constraints summarize non-negative balances, reservation protection and append-only history enforced by service logic. JAPZInventoryProfile is an illustrative modeling convention for this documentation, not an implemented profile engine or an additional application feature.`],
9:[`Figure 9 is a Level 1 data-flow view. Inventory Staff and Admin supply master details, receiving entries, counts, losses and review decisions. The first two processes maintain reference/policy data and stock transactions. Their outputs update balances, receipt/batch/count/waste records and movement history. Named arrows represent information transferred, rather than control flow or the chronological order of API calls.`, `The direct Cashier/Kitchen boundary provides order and status data for allocation, reservation, consumption and release; Kitchen waste reports enter the receiving/loss process. The reporting process reads master data, batches, allocations and movements to produce balances, availability and report data. CSV files are assembled in the frontend. The stores group related implemented tables for readability and do not assert a new physical database design.`],
10:[`Figure 10 keeps Inventory Staff as the principal actor and adds the necessary Admin boundary. Staff can view records, maintain supplies/suppliers, receive stock, manage recipes/batch holds, record counts/losses, review Kitchen waste and edit alert/refresh settings. Admin can perform these Inventory functions and also approve physical counts, reverse movements and control count-approval/reorder policies. These additional permissions are not granted to Inventory Staff.`, `Kitchen waste submission and Cashier/Kitchen availability access are documented as direct interactions rather than complete additional modules. Receiving necessarily validates and converts delivery quantities, and CSV export is optional when viewing reports. The diagram avoids treating the act of queuing a count for review as permission for Staff to perform Admin approval. Actor associations describe goals, not a required sequence of screens.`],
11:[`Figure 11 preserves the main choice between stock-changing work and read-only reports. Approved-user and role checks precede protected actions. On the stock path, receiving, count, waste and return inputs are validated against quantity, version and reservation rules. Related writes commit together, or a physical count is recorded as pending when policy requires Admin review; queuing that count leaves its balance unchanged.`, `Invalid input or a failed transactional write produces an error and rolls back pending changes. The user can correct the input and retry with the form's request identity. The report branch retrieves filtered data and may generate a browser CSV download. A merge node reunites successful branches before refreshing or leaving the workspace; denied access terminates the attempt without entering stock processing.`],
12:[`Figure 12 places receiving messages in implementation order. Receiving.tsx submits delivery lines and a requestId. Middleware verifies the approved user's role before receiveStock enters inventoryOperation. The service validates the request identity, computes a payload fingerprint and starts a transaction. Its locked InventoryOperation lookup distinguishes a matching saved request from a new operation or a conflicting reuse of the identifier.`, `For a new request, the service creates the operation, locks supplies and creates one receipt. The loop validates and converts each line, creates its batch and movement, updates balances and creates the receipt line. The operation result is saved before commit. Matching retries return the original result; invalid input, mismatched identity or failed writes return an error and roll back. Only a successful response leads the interface to refresh stock and receipt history.`],
13:[`Figure 13 preserves the StockCount states pending, applied, rejected and stale, while making the triggering conditions precise. A valid submission is created as applied when review is unnecessary, or pending when the Inventory user's discrepancy requires approval. Admin submissions bypass the approval queue. A pending count preserves the current balance until an Admin review decision is made.`, `Rejecting a pending count records rejected without changing stock. Approving it first checks the item's expected version and whether the counted quantity still covers reservations. A conflict records stale and requires a new count; otherwise the service applies the difference and records applied. Initial submission failures return an error before a count exists and must not be drawn as a newly created stale record. Re-reviewing a completed count does not apply the change again.`],
14:[`Figure 14 preserves the receiving collaboration as a communication diagram with numbered messages. Staff submit delivery data to the receiving interface, which posts to the Inventory router. The access-middleware participant verifies JWT identity, approved status and permitted role before the protected handler calls receiveStock. Separating that participant corrects the earlier implication that authorization occurs after the service starts.`, `The service coordinates the transaction, operation-identity lookup, repeated line writes, stored result and commit through Sequelize/MySQL. The asterisk denotes repetition for each delivery line. Replies follow the same collaboration links back to the UI. Participant names are documentation roles for implemented modules and records, not newly added runtime classes. Figure 12 contains the more detailed replay and rollback alternatives.`],
15:[`Figure 15 uses interaction-use frames labeled ref rather than embedding incomplete lifeline sketches inside reference boxes. Authorization is followed by an access decision. An authorized attempt invokes the receiving interaction expanded in Figure 12. A saved result, including a valid idempotent retry, is followed by retrieval of current stock and receipt history.`, `Denied access ends the attempt. A receiving error is displayed for correction or retry, and does not enter the successful-refresh path. The overview keeps activity decisions separate from the detailed message sequence and transaction logic. Each referenced interaction corresponds to existing authentication, receiving or refresh behavior; the frames do not imply a new workflow engine.`],
16:[`Figure 16 retains the participant activity timing view and explicitly defines its two levels: high means active and low means idle. Staff submission, UI transmission, access checks, stock processing and database work are placed in their causal order. Protected stock processing begins after authorization, and the UI displays the saved result after the persistence phase completes.`, `The zero-to-four-second axis is an illustrative teaching scale, not a measured response time, timeout, benchmark or performance requirement. Database activity includes the transaction and locking needed for receiving, while the service handles validation and related writes. The figure is a simplified successful interaction; duplicate-request, conflict and rollback alternatives are specified in Figure 12 rather than assigned invented durations here.`],
17:[`Figure 17 retains the five requirements derived from Inventory's overall purpose and expresses each with an Id and Text property. They cover direct-write access control, atomic/idempotent receiving, safe availability and reservation handling, versioned count approval, and traceable movement history. The access wording distinguishes direct Inventory/Admin adjustments from stock changes legitimately initiated through Cashier/Kitchen order transitions.`, `The deriveReqt dependencies point toward the overall requirement, while satisfy dependencies point from named implementation artifacts to the rule they implement. These artifacts are the existing middleware, routes, domain services and model definitions. The requirements are reconstructed from code behavior for academic traceability, not evidence of a separately approved product specification. Source and existing-test mappings are provided in the review notes; the diagram does not claim a new test run or production acceptance.`]
};
const sources={1:['INVENTORY_ARCHITECTURE.md','japz-web/src/App.tsx','japz-web/src/features/inventory/InventoryData.tsx','japz-web/src/features/inventory/HistoryReports.tsx','japz-backend/routes/index.js','japz-backend/routes/inventory.js','japz-backend/models/index.js'],2:['japz-backend/models/inventoryModels.js','japz-backend/models/index.js','japz-backend/services/inventoryService.js'],3:['japz-web/src/features/inventory','japz-backend/routes/inventory.js','japz-backend/middleware/access.js','japz-backend/services'],4:['start-local.ps1','japz-backend/models/db.js','japz-backend/index.js','japz-web/package.json'],5:['japz-backend/models/inventoryModels.js','japz-backend/services/inventoryService.js:390-528'],6:['japz-web/src/features/inventory','japz-backend/services','japz-backend/middleware/access.js','japz-backend/models/index.js'],7:['japz-backend/routes/inventory.js','japz-backend/services/inventoryService.js','japz-backend/middleware/access.js'],8:['japz-backend/models/inventoryModels.js','japz-backend/services/inventoryService.js','OMG UML 2.5.1 Profiles'],9:['japz-backend/routes/inventory.js','japz-backend/services/inventoryOrders.js','japz-web/src/features/inventory/HistoryReports.tsx'],10:['japz-backend/routes/inventory.js','japz-backend/services/inventorySettings.js','japz-web/src/features/inventory/CountsLosses.tsx'],11:['japz-backend/services/inventoryService.js','japz-web/src/features/inventory/Receiving.tsx','japz-web/src/features/inventory/data.ts'],12:['japz-backend/services/inventoryService.js:111-161','japz-backend/services/inventoryService.js:390-528','japz-web/src/features/inventory/Receiving.tsx'],13:['japz-backend/services/inventoryService.js:597-730','japz-backend/routes/inventory.js:262-282','japz-backend/services/inventorySettings.js'],14:['japz-backend/routes/inventory.js','japz-backend/services/inventoryService.js','japz-web/src/features/inventory/Receiving.tsx'],15:['japz-backend/middleware/access.js','japz-web/src/features/inventory/Receiving.tsx','japz-web/src/features/inventory/InventoryData.tsx'],16:['japz-web/src/features/inventory/Receiving.tsx','japz-backend/services/inventoryService.js'],17:['japz-backend/tests/inventory.test.js','japz-backend/middleware/access.js','japz-backend/services/inventoryService.js','japz-backend/services/inventoryOrders.js','OMG SysML 1.6 Requirements']};
for(const d of diagrams.values()){d.paragraphs=prose[d.n];d.description=prose[d.n].join('\n\n');d.sources=sources[d.n];}
// Keep revision history in REVIEW_NOTES, while the academic descriptions explain the final figures.
const academicOpenings={
 1:['Figure 1 replaces the earlier architecture with a verified version of the new GitDiagram architecture.','Figure 1 presents the Inventory module architecture verified from the supplied GitDiagram model and the implementation.'],
 2:['Figure 2 retains the core receiving class view and corrects its missing item associations.','Figure 2 illustrates the core Inventory record classes and their associations.'],
 4:['Figure 4 preserves the configured local-development view while correcting the communication paths.','Figure 4 shows the configured local deployment and its separate frontend and backend communication paths.'],
 5:['Figure 5 preserves the sample flour-receiving snapshot and adds the omitted StockReceiptLine-to-StockItem link.','Figure 5 shows an illustrative flour-receiving snapshot linking a supplier, stock item, receipt, line, batch and movement.'],
 7:['Figure 7 retains the existing composite structure because its receiving collaboration is consistent with the implementation.','Figure 7 models the internal stock-receiving collaboration within the Inventory API.'],
 8:['Figure 8 corrects the UML profile notation while retaining the Inventory-specific documentation purpose.','Figure 8 defines an Inventory-specific UML documentation profile.'],
 10:['Figure 10 keeps Inventory Staff as the principal actor and adds the necessary Admin boundary.','Figure 10 shows the Inventory Staff use cases and the direct Admin boundary.'],
 11:['Figure 11 preserves the main choice between stock-changing work and read-only reports.','Figure 11 models the main choice between stock-changing work and read-only reports.'],
 13:['Figure 13 preserves the StockCount states pending, applied, rejected and stale, while making the triggering conditions precise.','Figure 13 models the implemented StockCount states pending, applied, rejected and stale.'],
 14:['Figure 14 preserves the receiving collaboration as a communication diagram with numbered messages.','Figure 14 shows the receiving collaboration as a communication diagram with numbered messages.'],
 15:['Figure 15 uses interaction-use frames labeled ref rather than embedding incomplete lifeline sketches inside reference boxes.','Figure 15 coordinates the smaller receiving interactions using frames labeled ref and guarded activity decisions.'],
 16:['Figure 16 retains the participant activity timing view and explicitly defines its two levels: high means active and low means idle.','Figure 16 shows an illustrative participant activity timing view: high means active and low means idle.'],
 17:['Figure 17 retains the five requirements derived from Inventory\'s overall purpose and expresses each with an Id and Text property.','Figure 17 derives five requirements from Inventory\'s overall purpose and expresses each with an Id and Text property.'],
};
for(const [n,[from,to]] of Object.entries(academicOpenings)){const d=diagrams.get(Number(n));d.paragraphs=d.paragraphs.map(p=>p.replace(from,to));d.description=d.paragraphs.join('\n\n');}
diagrams.get(14).paragraphs[0]=diagrams.get(14).paragraphs[0].replace('Separating that participant corrects the earlier implication that authorization occurs after the service starts.','The middleware check must complete successfully before the protected service performs stock writes.');
diagrams.get(14).description=diagrams.get(14).paragraphs.join('\n\n');
for(const dir of ['images','svg','editable','mermaid'])await fs.mkdir(ROOT+'/'+dir,{recursive:true});
const all=[...diagrams.values()].sort((a,b)=>a.n-b.n);
await fs.writeFile(ROOT+'/_work/diagrams.json',JSON.stringify(all,null,2));
await fs.writeFile(ROOT+'/_work/artifact.md',`# Existing document edit contract\n\nReference: FAJUTAGANA_17_DIAGRAMS.docx. Preserve all existing style/theme/section/header/footer parts, title, identity, section order, captions and paragraph properties. Replace figure media and description text only. Preserve Figure 7 media byte-for-byte; use targeted updates to Figures 2, 5, 13 and 16. Other figures need structural correction. Figure 1 derives from the NEW supplied GitDiagram Mermaid/image, not the old Word architecture. Explanatory prose retains two paragraphs with length appropriate to the content. Keep original figure widths and aspect ratios for new canvases; reduce height only if Word pagination needs it. Final render uses Microsoft Word. Native OOXML and managed JavaScript replace the unavailable dependency-loader/Python/LibreOffice path.\n`);
export {ROOT,all};
