import fs from 'node:fs/promises';
const ROOT='C:/Users/ASUS/Desktop/Japz/output/inventory-diagrams-teacher-format';
const ds=[];
class D {
 constructor(n,name,h=800){this.n=n;this.name=name;this.w=900;this.h=h;this.ops=[];ds.push(this);}
 text(x,y,w,h,s,size=23,bold=false,align='center'){this.ops.push({kind:'text',x,y,w,h,s,size,bold,align});return this;}
 box(x,y,w,h,s='',kind='rect',size=23){this.ops.push({kind,x,y,w,h});if(s)this.text(x+10,y+8,w-20,h-16,s,size);return this;}
 line(points,arrow='',dash=false){this.ops.push({kind:'line',points,arrow,dash});return this;}
 edge(points,s='',x=0,y=0,w=180,arrow='open',dash=false){this.line(points,arrow,dash);if(s)this.text(x,y,w,Math.max(38,s.split('\n').length*30),s,21);return this;}
 actor(x,y,s){this.box(x+25,y,34,34,'','ellipse');this.line([[x+42,y+34],[x+42,y+95]]);this.line([[x+5,y+57],[x+79,y+57]]);this.line([[x+42,y+95],[x+9,y+137]]);this.line([[x+42,y+95],[x+75,y+137]]);this.text(x-55,y+140,195,60,s,23);}
 dot(x,y,final=false){this.ops.push({kind:'dot',x,y,final});}
 klass(x,y,w,title,attrs){let h=52+attrs.length*32+12;this.box(x,y,w,h);this.text(x+5,y+5,w-10,40,title,23,true);this.line([[x,y+52],[x+w,y+52]]);this.text(x+10,y+59,w-20,h-66,attrs.join('\n'),21,false,'left');return h;}
 finish(caption,desc){this.caption=caption;this.description=desc;}
}
let d;
d=new D(1,'System Architecture Diagram',780);
d.actor(407,8,'Inventory Staff');
d.box(200,240,500,95,'Inventory Web Interface\nReact / TypeScript');
d.edge([[450,208],[450,240]]);
d.box(200,400,500,105,'Inventory API\nExpress + access checks');
d.edge([[450,335],[450,400]],'HTTP / JSON',490,349,200);
d.box(65,570,340,90,'Stock and recipe services');d.box(495,570,340,90,'Report and settings handlers');
d.edge([[330,505],[330,570]]);d.edge([[570,505],[570,570]]);
d.box(225,710,450,65,'Sequelize models / MySQL');
d.edge([[235,660],[235,690],[340,690],[340,710]]);d.edge([[665,660],[665,690],[560,690],[560,710]]);
d.finish('System Architecture of the JAPZ Inventory Module','Figure 1 shows how Inventory Staff access the inventory interface. The Express API checks permissions and processes stock, recipe, report, and settings requests, while Sequelize stores and retrieves inventory records in MySQL.');

d=new D(2,'Class Diagram',1000);
d.klass(45,30,330,'Supplier',['id: Integer','name: String','active: Boolean']);
d.klass(525,30,330,'StockItem',['id: Integer','name, kind, unit','onHand, reserved: Decimal']);
d.line([[375,100],[525,100]]);d.text(385,50,55,35,'0..1',21);d.text(460,50,65,35,'0..*',21);
d.klass(45,280,330,'StockReceipt',['id, supplierId','number: String','receivedAt: Date']);
d.klass(525,280,330,'StockBatch',['id, stockItemId','onHand, reserved: Decimal','expiryDate, quarantined']);
d.line([[210,190],[210,280]]);d.text(215,193,75,35,'0..1',21);d.text(215,242,75,35,'0..*',21);
d.line([[690,190],[690,280]]);d.text(695,193,75,35,'1',21);d.text(695,242,75,35,'0..*',21);
d.klass(45,545,330,'StockReceiptLine',['receiptId, stockItemId','batchId, conversion','quantity, unitCost: Decimal']);
d.klass(525,545,330,'StockMovement',['stockItemId, batchId','action, quantity, reason','onHandDelta, reservedDelta']);
d.line([[210,440],[210,545]]);d.text(215,450,75,35,'1',21);d.text(215,505,75,35,'1..*',21);
d.line([[630,440],[630,485],[375,485],[375,585]]);d.text(630,448,75,35,'1',21);d.text(382,538,75,35,'0..*',21);
d.line([[745,440],[745,545]]);d.text(750,450,75,35,'0..1',21);d.text(750,505,75,35,'0..*',21);
d.box(45,815,810,140,'Other inventory records: StockCount, WasteReport,\nMenuRecipe, StockAllocation, InventorySettings, InventoryOperation.\nPrepared quantities are stored in the shared MenuItem model.','note',23);
d.finish('Core Inventory Classes and Relationships','Figure 2 shows the main classes used to receive and track supplies. A receipt contains delivery lines, each linked to an item and batch; movements record quantity changes. Supporting classes handle counts, waste reports, recipes, reservations, and settings.');

d=new D(3,'Component Diagram',730);
d.box(180,25,540,100,'«component»\nInventory Screens');
d.box(180,215,540,105,'«component»\nInventory Data Provider + HTTP Client');
d.edge([[450,125],[450,215]],'uses',480,155,120,'open',true);
d.box(180,410,540,105,'«component»\nInventory Router + Access Middleware');
d.edge([[450,320],[450,410]],'JSON API',480,350,170,'open',true);
d.box(35,615,380,95,'«component»\nInventory Services');d.box(485,615,380,95,'«component»\nSequelize Models');
d.edge([[320,515],[320,615]],'',0,0,0,'open',true);d.edge([[580,515],[580,615]],'',0,0,0,'open',true);d.edge([[415,660],[485,660]],'',0,0,0,'open',true);
d.finish('Components of the Inventory Module','Figure 3 shows the software components that support inventory operations. Inventory screens use a shared data provider and HTTP client to access the API. The router works with access checks, inventory services, and database models to process requests.');

d=new D(4,'Deployment Diagram',760);
d.box(140,25,620,165,'«device» Staff Computer\n«executionEnvironment» Web Browser\nInventory React Application','node',24);
d.box(140,285,620,165,'«executionEnvironment» Node.js\nVite development server: 5173\nExpress inventory API: 3000','node',24);
d.edge([[450,190],[450,285]],'HTTP requests',470,214,220);
d.box(140,550,620,160,'«executionEnvironment» MySQL\nDatabase: japz_pos\nPort: 3306','node',24);
d.edge([[450,450],[450,550]],'SQL through Sequelize',470,480,320);
d.finish('Local Deployment of the Inventory Module','Figure 4 shows the configured local deployment of the inventory module. Staff use a browser to access the React application, which communicates with the Express API. The backend reads and saves inventory data in MySQL through Sequelize.');

d=new D(5,'Object Diagram',780);
d.klass(30,30,370,'supplier1 : Supplier',['id = 1','name = "Sample Supplier"']);
d.klass(500,30,370,'item1 : StockItem',['id = 10; name = "Flour"','unit = "g"; onHand = 5000']);
d.line([[400,100],[500,100]]);
d.klass(30,280,370,'receipt1 : StockReceipt',['id = 20; supplierId = 1','number = "REC-020"']);
d.klass(500,280,370,'batch1 : StockBatch',['id = 30; stockItemId = 10','onHand = 5000; reserved = 0']);
d.line([[215,159],[215,280]]);d.line([[685,159],[685,280]]);
d.klass(30,545,370,'line1 : StockReceiptLine',['receiptId = 20; batchId = 30','purchaseQuantity = 5; unit = kg','conversion = 1000','quantity = 5000 g']);
d.klass(500,545,370,'movement1 : StockMovement',['action = "receive"; batchId = 30','onHandDelta = 5000 g']);
d.line([[215,409],[215,545]]);d.line([[630,409],[630,477],[400,477],[400,585]]);d.line([[740,409],[740,545]]);
// UML instance names are underlined.
for(const o of d.ops.filter(o=>o.kind==='text'&&o.bold))o.underline=true;
d.finish('Example Objects After Receiving Flour','Figure 5 presents an illustrative stock receipt for five kilograms of flour. The system converts the delivery to 5,000 grams and links the supplier, receipt, line, batch, and movement records. These sample values demonstrate the model and are not actual business records.');

d=new D(6,'Package Diagram',750);
d.box(90,25,720,115,'«package» Inventory Interface\nReceiving, Supplies, Counts, Recipes, Reports','package',24);
d.box(90,225,720,110,'«package» Shared Client\nInventory data context + API client','package',24);
d.box(90,425,720,110,'«package» Backend Routes\nInventory API + access middleware','package',24);
d.box(25,635,385,100,'«package» Services\nStock, availability, settings','package',23);
d.box(490,635,385,100,'«package» Models\nInventory records + database','package',23);
for(let [a,b] of [[140,225],[335,425]])d.edge([[450,a],[450,b]],'',0,0,0,'open',true);
d.edge([[290,535],[290,635]],'',0,0,0,'open',true);d.edge([[610,535],[610,635]],'',0,0,0,'open',true);d.edge([[410,685],[490,685]],'',0,0,0,'open',true);
d.finish('Packages of the Inventory Module','Figure 6 groups the inventory source into interface, client, route, service, and model packages. The dependencies show how inventory pages reach the backend and database. This organization separates screen behavior, business rules, and data storage.');

d=new D(7,'Composite Structure Diagram',750);
d.box(45,70,810,600);d.text(75,90,750,50,'Inventory API: internal structure',25,true);
d.box(29,180,32,32);d.text(10,10,350,50,'HTTP request port',22);
d.box(145,175,610,90,'access : Authentication / Role Check');
d.box(145,345,610,90,'handler : Inventory Route');
d.box(145,515,350,95,'stock : Inventory Service');d.box(575,515,180,95,'data :\nModels');
d.line([[61,196],[145,196]]);d.line([[450,265],[450,345]]);d.line([[320,435],[320,515]]);d.line([[495,562],[575,562]]);
d.box(839,550,32,32);d.line([[755,566],[839,566]]);d.text(540,680,340,45,'SQL persistence port',22);
d.finish('Internal Collaboration Within the Inventory API','Figure 7 shows the collaborating parts inside the inventory API. Access checks pass authorized requests to route handlers, which call inventory services and models. The HTTP and SQL ports represent the module boundaries used for requests and persistence.');

d=new D(8,'Profile Diagram',750);
d.box(30,20,840,690);d.text(60,35,780,55,'«profile» JAPZ Inventory Documentation',25,true);
const st=[['InventoryRecord','Class','unit, auditFields'],['StockService','Component','responsibility'],['StockOperation','Operation','action, changesBalance']];
for(let i=0;i<3;i++){let y=150+i*180;d.box(90,y,390,120,'«stereotype» '+st[i][0]+'\n'+st[i][2],'rect',22);d.box(635,y,170,120,'«metaclass»\n'+st[i][1],'rect',22);d.edge([[480,y+60],[635,y+60]],'extends',483,y+9,145,'filled');}
d.finish('Inventory Documentation Profile','Figure 8 defines inventory-specific stereotypes for UML documentation. InventoryRecord identifies stored records, StockService identifies service components, and StockOperation identifies stock actions. These labels are modeling conventions and are not an additional application feature.');

d=new D(9,'Data Flow Diagram (DFD)',900);
d.box(300,10,300,80,'Inventory Staff');d.box(35,225,370,105,'1.0 Maintain Supplies\nand Suppliers','round',24);d.box(495,225,370,105,'2.0 Receive or\nAdjust Stock','round',24);
d.edge([[355,90],[355,160],[220,160],[220,225]],'item details',70,118,170,'filled');d.edge([[545,90],[545,160],[680,160],[680,225]],'stock entry',648,118,165,'filled');
d.box(35,410,370,90,'D1  Items / Suppliers','store',22);d.box(495,410,370,90,'D2  Receipts / Batches','store',22);
d.edge([[220,330],[220,410]],'records',240,350,140,'filled');d.edge([[680,330],[680,410]],'receipt data',695,350,175,'filled');
d.box(495,595,370,90,'D3  Stock Movements','store',22);d.edge([[845,280],[885,280],[885,640],[865,640]],'',0,0,0,'filled');
d.box(35,610,370,105,'3.0 View Stock\nand Reports','round',24);d.edge([[220,500],[220,610]],'balances',235,540,150,'filled');d.edge([[495,450],[455,450],[455,610],[405,610]],'batch data',465,531,180,'filled');d.edge([[495,660],[405,660]],'',0,0,0,'filled');
d.box(35,805,370,75,'Inventory Staff');d.edge([[220,715],[220,805]],'stock / reports',235,745,230,'filled');
d.finish('Inventory Data Flow','Figure 9 shows how inventory information moves between staff, processes, and data stores. Supply maintenance saves item and supplier records, while stock operations update receipts, batches, and movements. The reporting process reads these records to display balances and stock history.');

d=new D(10,'Use Case Diagram',960);
d.box(250,10,600,930);d.text(270,25,560,45,'JAPZ Inventory Module',25,true);d.actor(77,290,'Inventory Staff');
const goals=['View stock and availability','Maintain supplies and suppliers','Receive stock and prepared stock','Manage batches and recipes','Record counts, waste, and returns','Review Kitchen waste reports','View history and export reports','Configure inventory settings'];
for(let i=0;i<goals.length;i++){let y=100+i*103;d.box(350,y,455,73,goals[i],'ellipse',23);d.line([[240,y+36],[350,y+36]]);}
d.line([[160,380],[240,380]]);d.line([[240,136],[240,857]]);
d.finish('Inventory Staff Use Cases','Figure 10 shows the actions available to Inventory Staff, from supply setup and receiving to counts, waste review, reports, and settings. Counts that require approval are sent to Admin, who also controls movement reversals and approval policies. Other roles appear only through their inventory interactions.');

d=new D(11,'Activity Diagram',980);
d.dot(350,20);d.box(140,65,420,75,'Enter delivery details','round');d.edge([[350,32],[350,65]]);
d.box(140,190,420,75,'Check access and request identity','round');d.edge([[350,140],[350,190]]);
d.box(240,320,220,110,'Same saved\nrequest?','diamond',23);d.edge([[350,265],[350,320]]);
d.box(640,337,225,80,'Return saved receipt','round',22);d.edge([[460,375],[640,375]],'Yes',480,329,120);
d.box(140,495,420,85,'Validate lines and convert units','round');d.edge([[350,430],[350,495]],'No',360,445,80);
d.box(140,630,420,100,'Save receipt, batches, balances,\nand movements in one transaction','round',23);d.edge([[350,580],[350,630]]);
d.box(140,800,420,75,'Commit and refresh stock','round');d.edge([[350,730],[350,800]]);
d.dot(350,945,true);d.edge([[350,875],[350,933]]);d.edge([[752,417],[752,945],[362,945]]);
d.box(640,590,225,150,'Error:\nRoll back changes\nand show message','round',23);d.edge([[560,670],[640,670]],'',0,0,0,'open',true);d.dot(752,815,true);d.edge([[752,740],[752,803]]);
d.finish('Stock Receiving Activity','Figure 11 follows a stock receipt from delivery entry to the updated balance. The system checks access, validates the request, converts purchase units, and saves the related records together. An identical saved request returns its original result; a failed transaction rolls back its changes.');

d=new D(12,'Sequence Diagram',970);
const xs=[90,325,555,800];const heads=['Inventory\nStaff','Receiving\nInterface','Inventory\nAPI / Service','Sequelize\n/ MySQL'];
for(let i=0;i<4;i++){d.box(xs[i]-82,10,164,85,heads[i],'rect',22);d.line([[xs[i],95],[xs[i],925]],'',true);}
let msgs=[[0,1,155,'Enter delivery',false],[1,2,250,'Submit + request ID',false],[2,3,355,'Check saved request',false],[3,2,435,'No saved result',true],[2,3,535,'Validate and save stock',false],[2,3,640,'Commit transaction',false],[3,2,725,'Saved receipt',true],[2,1,810,'Receipt response',true],[1,0,900,'Refresh display',true]];
for(const[a,b,y,s,dash]of msgs)d.edge([[xs[a],y],[xs[b],y]],s,Math.min(xs[a],xs[b])+4,y-48,Math.abs(xs[b]-xs[a])-8,dash?'open':'filled',dash);
d.finish('Sequence of a Successful Stock Receipt','Figure 12 shows the order of messages during a new stock receipt. The interface submits the delivery and request ID, the backend validates and saves the stock changes, and the database commits the transaction. The saved receipt is returned so the interface can refresh the display.');

d=new D(13,'State Machine Diagram',850);
d.dot(450,25);d.box(345,85,210,110,'Approval\nrequired?','diamond',23);d.edge([[450,37],[450,85]]);
d.box(335,285,230,95,'pending\nBalance unchanged','round',23);d.edge([[450,195],[450,285]],'Yes',465,220,90);
d.box(40,635,240,105,'rejected\nNo stock change','round',23);d.box(330,635,240,105,'stale\nNew count needed','round',23);d.box(620,635,240,105,'applied\nStock updated','round',23);
d.edge([[335,335],[160,335],[160,635]],'Admin rejects',25,435,215);
d.box(330,445,240,110,'Review still\nvalid?','diamond',23);d.edge([[450,380],[450,445]]);
d.edge([[450,555],[450,635]],'No',460,580,70);
d.edge([[570,500],[740,500],[740,635]],'Yes / approve',635,530,190);
d.edge([[555,140],[880,140],[880,690],[860,690]],'No / apply immediately',595,200,265);
d.finish('Stock Count Status Changes','Figure 13 shows the implemented stock count states: pending, applied, rejected, and stale. A count applies immediately when review is unnecessary; otherwise, Admin reviews it. Approval changes the balance only when the stock version and reserved quantities remain valid.');

d=new D(14,'Communication Diagram',870);
d.box(40,75,300,100,': InventoryStaff');d.box(535,75,325,100,': ReceivingInterface');
d.box(535,355,325,100,': InventoryRouter');d.box(535,675,325,100,': InventoryService');d.box(40,675,300,100,': Sequelize / MySQL');
d.edge([[340,125],[535,125]],'1: submit',352,77,170);
d.edge([[697,175],[697,355]],'1.1: POST receive',380,237,280);
d.edge([[697,455],[697,675]],'1.1.1: authorize\n1.1.2: receiveStock',335,532,320);
d.edge([[535,725],[340,725]],'1.1.2.1: save + commit',305,630,300);
d.edge([[340,790],[535,790]],'1.1.2.2: receipt',365,802,250,'open',true);
d.line([[845,675],[885,675],[885,125],[860,125]],'open',true);d.text(335,195,330,40,'1.2: receipt response',22);
d.finish('Object Communication During Receiving','Figure 14 shows the collaborating objects in a stock receipt. Numbered messages follow the request from Inventory Staff to the interface, router, service, and database. The service saves the receipt and stock changes, then returns the result to the interface.');

d=new D(15,'Interaction Overview Diagram',920);
d.dot(360,20);d.box(110,65,500,100,'ref  Authorize receiving request');d.edge([[360,32],[360,65]]);
d.box(255,220,210,110,'Access\nallowed?','diamond');d.edge([[360,165],[360,220]]);
d.box(670,245,205,85,'ref  Show error','rect',22);d.edge([[465,275],[670,275]],'No',490,230,120);
d.box(110,390,500,110,'ref  Receive stock transaction\nSee Sequence Diagram (Figure 12)');d.edge([[360,330],[360,390]],'Yes',365,345,90);
d.box(255,560,210,110,'Saved or\nreplayed?','diamond',23);d.edge([[360,500],[360,560]]);
d.edge([[465,615],[640,615],[640,285],[670,285]],'No / rollback',495,650,165);
d.box(110,750,500,90,'ref  Refresh inventory display');d.edge([[360,670],[360,750]],'Yes',365,695,90);
d.dot(360,895,true);d.edge([[360,840],[360,883]]);d.edge([[770,330],[770,895],[372,895]]);
d.finish('Overview of Inventory Receiving Interactions','Figure 15 connects the major receiving interactions: authorization, transactional stock receipt, and display refresh. Decisions route denied access or failed saves to an error response. The detailed receiving messages are expanded in Figure 12.');

d=new D(16,'Timing Diagram',750);
d.text(25,5,850,55,'Visible-tab inventory refresh: 30-second setting',25,true);
const x0=260,x1=850;function tx(t){return x0+(x1-x0)*t/60;}
for(let t of [0,15,30,45,60]){d.line([[tx(t),125],[tx(t),600]],'',true);d.text(tx(t)-32,620,64,40,String(t),22);}
function wave(label,y,events){d.text(15,y-5,170,90,label,23,true);d.text(180,y-15,65,30,'true',20);d.text(180,y+68,65,30,'false',20);d.line(events.map(([t,v])=>[tx(t),y+(v?0:90)]));}
wave('Tab\nvisible',150,[[0,true],[60,true]]);
wave('Provider\nrefreshing',330,[[0,true],[3,true],[3,false],[30,false],[30,true],[34,true],[34,false],[60,false],[60,true]]);
wave('API request\npending',510,[[0,true],[3,true],[3,false],[30,false],[30,true],[34,true],[34,false],[60,false],[60,true]]);
d.text(235,682,640,40,'Elapsed time (seconds)',23);
d.finish('Timing of Inventory Data Refresh','Figure 16 shows inventory refreshes at the configured 30-second interval while the tab is visible. Successful requests update the displayed data; focus or manual refresh can trigger an earlier update. The illustrated three- and four-second request durations are examples, not measured response times.');

d=new D(17,'Requirement Diagram (SysML)',980);
let reqs=[['INV-01','Authorized stock changes','Approved Inventory or Admin may write stock.','Access middleware'],['INV-02','Reliable receiving','Save together; identical requests do not duplicate stock.','Stock receipt service'],['INV-03','Safe stock availability','Exclude expired / held stock and protect reservations.','Availability / stock services'],['INV-04','Controlled counts','Reject stale counts and require review when configured.','Count / review services'],['INV-05','Traceable stock history','Record quantity changes, actor, and reason.','Movement records']];
for(let i=0;i<reqs.length;i++){let[id,name,txt,block]=reqs[i],y=20+i*190;d.box(370,y,510,155);d.text(380,y+6,490,45,'«requirement» '+name,23,true);d.line([[370,y+55],[880,y+55]]);d.text(385,y+63,480,84,id+'\n'+txt,22,false,'left');d.box(20,y+15,235,115,'«block»\n'+block,'rect',22);d.edge([[255,y+75],[370,y+75]],'«satisfy»',255,y+20,115,'open',true);}
d.finish('Requirements of the Inventory Module','Figure 17 links the inventory module’s key rules to the elements that satisfy them. The requirements cover authorized changes, reliable receiving, safe availability, controlled counts, and traceable history. These rules are drawn from the project’s implemented inventory behavior.');
// Retain standard UML interaction-use frames and profile extension notation.
for(const dia of ds){for(const o of dia.ops){if(o.kind==='rect'&&dia.n===15){dia.ops.push({kind:'line',points:[[o.x,o.y+32],[o.x+48,o.y+32],[o.x+60,o.y+20],[o.x+60,o.y]],arrow:'',dash:false});}}}
await fs.writeFile(ROOT+'/_work/diagrams.json',JSON.stringify(ds,null,2));
console.log('Prepared '+ds.length+' inventory diagrams.');
export { D, ds };
