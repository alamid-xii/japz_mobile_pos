import fs from 'node:fs/promises';
import {D,ds} from './author_clean.mjs';
const previous=new Map(ds.map(d=>[d.n,d]));
function end(d,description){let p=previous.get(d.n);d.finish(p.caption,description||p.description);}
function group(d,x,y,w,h,title,rows,kind='rect',size=23){d.box(x,y,w,h,'',kind);d.text(x+15,y+12,w-30,44,title,size,true);let rh=(h-65)/rows.length;rows.forEach((s,i)=>{if(rh<49)d.text(x+18,y+65+i*rh,w-36,rh-2,s,22);else d.box(x+18,y+65+i*rh,w-36,rh-4,s,'rect',22);});}
function frame(d,type,title){let content=d.ops;d.ops=[];d.box(5,5,d.w-10,d.h-10);d.box(5,5,Math.min(640,title.length*13+100),45);d.text(18,9,Math.min(600,title.length*13+75),35,type+'  '+title,24,true,'left');d.ops.push(...content);}
let d;
d=new D(1,'System Architecture Diagram',1050);
d.box(75,15,750,155);d.text(95,20,710,40,'Users of the Inventory Module',24,true);
group(d,95,65,340,88,'Inventory Staff',[]);group(d,465,65,340,88,'Admin',[]);
d.text(100,110,330,40,'Daily stock operations',21);d.text(470,110,330,40,'Approvals and corrections',21);
group(d,60,250,460,260,'Inventory Web Application',['Overview / Stock Balances','Receiving / Counts / Waste','Recipes / Reports / Settings']);
group(d,630,285,240,180,'Access Control',['Approved account','Role permissions']);
d.edge([[320,170],[320,250]],'HTTP access',335,192,200,'filled');
d.edge([[520,335],[630,335]],'request',520,292,110,'filled');d.edge([[630,405],[520,405]],'authorized',510,423,130,'filled');
group(d,60,590,810,245,'Application Server: Express Inventory API',[]);
group(d,82,660,375,150,'Stock / Recipe Services',['Receiving, counts, waste, returns','Recipes / Batch availability']);
group(d,482,660,365,150,'Report / Settings Handlers',['Movement history / CSV exports','Alerts / Refresh settings']);
d.edge([[290,510],[290,590]],'JSON requests',305,539,220,'filled');d.edge([[745,465],[745,560],[770,560],[770,590]],'role check',650,510,180,'filled');
d.box(175,910,550,130,'Inventory Database (MySQL)\nItems, suppliers, batches, receipts,\ncounts, movements, recipes, and settings','cylinder',23);
d.edge([[450,835],[450,910]],'SQL through Sequelize',465,850,340,'filled');
end(d);

d=new D(3,'Component Diagram',1000);
group(d,55,65,790,735,'«component» JAPZ Inventory Module',[]);
group(d,85,145,365,240,'«component» Inventory UI',['Stock / Receiving Screens','Count / Waste / Recipe Screens','Reports / Settings Screens']);
group(d,510,145,305,240,'«component» Access',['JWT authentication','Approved-user / role checks']);
group(d,85,485,365,240,'«component» Inventory Services',['Receive / count / waste / return','Recipes / Menu availability','Versioned stock operations']);
group(d,510,485,305,240,'«component» Handlers',['Reports / History','Settings / Refresh policy','Sequelize model access']);
d.edge([[450,260],[510,260]],'',0,0,0,'filled');d.box(470,242,25,25,'','ellipse');d.text(445,392,380,45,'Authentication interface',21);
d.edge([[260,385],[260,485]],'Inventory API',270,410,220,'filled');d.edge([[660,385],[660,485]],'',0,0,0,'filled');
d.line([[450,615],[510,615]],'open',true);
d.box(250,870,400,115,'«database»\nMySQL Inventory Records','cylinder',23);d.edge([[260,725],[260,835],[410,835],[410,870]],'',0,0,0,'filled');d.edge([[660,725],[660,835],[500,835],[500,870]],'',0,0,0,'filled');
end(d);

d=new D(4,'Deployment Diagram',1040);
group(d,90,40,720,245,'«device» Staff Computer',[],'node');group(d,115,110,480,150,'«executionEnvironment» Browser',['«artifact» Inventory React UI']);d.box(625,135,155,110,'Inventory\nStaff / Admin','rect',22);
d.box(270,375,360,85,'Local HTTP Connection','ellipse',24);d.edge([[450,285],[450,375]],'HTTP / JSON',465,310,200,'filled');
group(d,90,545,720,245,'«device» Local Development Host',[],'node');group(d,115,620,320,135,'Vite: port 5173',['Frontend assets']);group(d,465,620,320,135,'Node.js: port 3000',['Express inventory API']);d.edge([[450,460],[450,545]],'',0,0,0,'filled');
group(d,200,865,500,150,'«executionEnvironment» MySQL',[],'node');d.text(230,925,440,50,'«artifact» japz_pos : port 3306',23);
d.edge([[625,790],[625,830],[450,830],[450,865]],'Sequelize / SQL',475,800,250,'filled');end(d);

d=new D(6,'Package Diagram',1030);
group(d,35,40,830,560,'JAPZ Inventory Source',[],'package');
group(d,65,125,350,185,'«package» presentation',['Receiving / Supplies / Counts','Recipes / Reports / Settings'],'package');
group(d,500,125,335,185,'«package» client',['InventoryData / data context','API client / request IDs'],'package');
group(d,65,380,350,185,'«package» routes',['Inventory endpoints','Access middleware'],'package');
group(d,500,380,335,185,'«package» services',['Stock / Order allocations','Availability / Settings'],'package');
d.edge([[415,220],[500,220]],'«uses»',417,170,83,'open',true);d.edge([[650,310],[650,345],[240,345],[240,380]],'HTTP API',375,306,180,'open',true);d.edge([[415,470],[500,470]],'«uses»',418,419,82,'open',true);
group(d,65,700,350,190,'«package» models',['Items / Batches / Receipts','Counts / Movements / Recipes'],'package');
group(d,500,700,335,190,'«package» shared',['MenuItem / User / Order','Database connection'],'package');
d.edge([[650,565],[650,650],[240,650],[240,700]],'«access»',370,604,200,'open',true);d.edge([[650,565],[650,700]],'',0,0,0,'open',true);
d.box(265,960,370,60,'MySQL : Inventory Storage','rect',23);d.edge([[240,890],[240,990],[265,990]],'',0,0,0,'open',true);d.edge([[650,890],[650,990],[635,990]],'',0,0,0,'open',true);end(d);

d=new D(8,'Profile Diagram',990);
group(d,120,35,660,170,'«profile» JAPZInventoryProfile',[],'package');d.text(145,102,610,85,'name = "JAPZInventoryProfile"\nPurpose: inventory-specific UML documentation',23,false,'left');
const profiles=[['InventoryRecord','Class',['unit : BaseUnit','auditFields : Boolean']],['StockService','Component',['responsibility : String','module = "inventory"']],['StockOperation','Operation',['action : StockAction','changesBalance : Boolean']]];
profiles.forEach(([n,m,a],i)=>{let x=25+i*295;d.klass(x,330,270,n,a);d.text(x,295,270,32,'«stereotype»',21);d.text(x+8,505,254,50,'extends '+m,22);d.edge([[450,205],[450,270],[x+135,270],[x+135,295]],'',0,0,0,'open',true);});
d.klass(25,665,270,'BaseUnit',['g','ml','pcs']);d.text(25,628,270,32,'«enumeration»',21);d.klass(320,665,270,'StockAction',['receive / count','reserve / consume','release / waste','supplier_return']);d.text(320,628,270,32,'«enumeration»',21);d.box(615,665,270,180,'«constraints»\nNo negative stock\nProtect reservations\nKeep movement history','note',22);
d.line([[160,477],[160,665]],'open',true);d.line([[750,477],[750,610],[455,610],[455,665]],'open',true);
d.text(30,920,840,55,'Documentation conventions; no runtime UML profile is installed.',22);end(d);

d=new D(10,'Use Case Diagram',1040);
d.box(175,40,710,970);d.text(190,52,680,45,'JAPZ Inventory Management',25,true);d.actor(25,400,'Inventory\nStaff');
const main=['View inventory overview','Maintain supplies / suppliers','Receive stock','Record physical count','Record waste / return','Manage recipes / batches','View history / reports'];
for(let i=0;i<main.length;i++){let y=130+i*115;d.box(220,y,335,78,main[i],'ellipse',22);d.line([[110,493],[220,y+39]]);}
d.box(675,310,185,100,'Validate delivery\nand convert units','ellipse',22);d.edge([[555,400],[675,360]],'«include»',550,310,130,'open',true);
d.box(675,520,185,100,'Submit for\nAdmin review','ellipse',22);d.edge([[675,570],[555,514]],'«extend»',546,575,130,'open',true);
d.box(675,770,185,100,'Export CSV','ellipse',22);d.edge([[675,810],[555,850]],'«extend»',551,744,130,'open',true);
d.text(605,910,250,60,'[Approval policy]\n[Export selected]',21);end(d,'Figure 10 shows the inventory goals available to Inventory Staff. Receiving includes delivery validation and unit conversion; count review and CSV export extend the related goals when their conditions apply. Admin handles required count approvals and movement reversals.');

d=new D(11,'Activity Diagram',1100);
d.dot(450,18);d.box(275,65,350,70,'Open Inventory Workspace','round');d.edge([[450,30],[450,65]],'',0,0,0,'filled');
d.box(275,180,350,70,'Authenticate / check role','round');d.edge([[450,135],[450,180]],'',0,0,0,'filled');
d.box(350,290,200,100,'Authorized?','diamond');d.edge([[450,250],[450,290]],'',0,0,0,'filled');
d.box(660,305,210,70,'Display access denied','round',22);d.edge([[550,340],[660,340]],'No',565,298,80,'filled');d.edge([[450,390],[450,440]],'Yes',457,398,90,'filled');
d.box(275,440,350,65,'Choose inventory function','round');d.edge([[450,505],[450,545],[235,545],[235,595]],'',0,0,0,'filled');d.edge([[450,545],[685,545],[685,595]],'',0,0,0,'filled');
d.box(45,595,380,75,'Receive / Count / Waste / Return','round',22);d.box(500,595,370,75,'View Balances / History / Reports','round',22);
d.box(45,730,380,75,'Validate quantities and permissions','round',22);d.edge([[235,670],[235,730]],'',0,0,0,'filled');d.box(500,730,370,75,'Choose filters and read stock data','round',22);d.edge([[685,670],[685,730]],'',0,0,0,'filled');
d.box(45,865,380,80,'Save changes together\nor queue count for review','round',22);d.edge([[235,805],[235,865]],'',0,0,0,'filled');d.box(500,865,370,80,'Display results / export CSV','round',22);d.edge([[685,805],[685,865]],'',0,0,0,'filled');
d.box(300,1010,300,60,'Refresh / leave workspace','round',22);d.edge([[235,945],[235,980],[450,980],[450,1010]],'',0,0,0,'filled');d.edge([[685,945],[685,980],[450,980]],'',0,0,0,'filled');d.dot(635,1040,true);d.edge([[600,1040],[623,1040]],'',0,0,0,'filled');d.edge([[765,375],[890,375],[890,1080],[635,1080],[635,1052]],'',0,0,0,'filled');
end(d,'Figure 11 presents the main Inventory Staff workflow after authentication. Staff can record stock operations or view balances, history, and reports. Stock changes are validated and saved together, while counts that require approval remain pending until Admin review.');

d=new D(12,'Sequence Diagram',1080);
const xx=[85,320,555,795];const titles=['Inventory\nStaff','«boundary»\nReceiving UI','«control»\nAPI / Service','«entity»\nModels / MySQL'];
for(let i=0;i<4;i++){d.box(xx[i]-77,80,154,105,titles[i],'rect',22);d.line([[xx[i],185],[xx[i],1040]],'',true);}
for(let[x,y,h]of [[320,225,670],[555,285,540],[795,350,400]])d.box(x-7,y,14,h);
let ms=[[0,1,225,'1. enter delivery',false],[1,2,290,'2. submit + requestId',false],[2,3,375,'3. find prior request',false],[3,2,445,'4. no prior result',true],[2,3,550,'5. validate / convert',false],[2,3,640,'6. receipt + stock writes',false],[2,3,735,'7. commit result',false],[2,1,835,'8. return receipt',true],[1,0,905,'9. refresh stock',true]];
for(let[a,b,y,s,reply]of ms)d.edge([[xx[a],y],[xx[b],y]],s,Math.min(xx[a],xx[b])+8,y-43,Math.abs(xx[b]-xx[a])-16,reply?'open':'filled',reply);
d.box(505,490,375,210);d.text(515,495,325,40,'loop  [each delivery line]',21,true,'left');
d.box(15,945,865,103);d.text(25,950,220,32,'alt  [saved request]',22,true,'left');d.text(240,954,620,34,'Return the original receipt without duplicating stock',21);d.line([[15,992],[880,992]],'',true);d.text(25,1000,215,35,'[invalid / failed save]',21,true,'left');d.text(245,1000,620,35,'Rollback transaction and return an error',21);
frame(d,'sd','Receive Inventory Stock');end(d);

// Add state compartments, entry effects, guarded transitions, and an enclosing frame.
d=previous.get(13);d.ops=d.ops.filter(o=>!(o.kind==='text'&&/No \/ apply immediately/.test(o.s)));
for(let o of d.ops.filter(o=>o.kind==='round')){d.line([[o.x,o.y+43],[o.x+o.w,o.y+43]]);let t=d.ops.find(q=>q.kind==='text'&&q.x===o.x+10&&q.y===o.y+8);if(t){let[a,b]=t.s.split('\n');t.s=a;t.h=30;t.bold=true;d.text(o.x+10,o.y+48,o.w-20,o.h-53,'entry / '+(b==='Balance unchanged'?'keep balance':b),20);}}
d.text(555,190,320,45,'[No review required] / apply',21);
// Move the original state contents below the frame tab.
for(const o of d.ops){if(o.y!==undefined)o.y+=60;if(o.points)o.points=o.points.map(([x,y])=>[x,y+60]);}d.h=920;frame(d,'stm','Stock Count Lifecycle');

d=previous.get(14);for(let o of d.ops.filter(o=>o.kind==='rect')){d.line([[o.x,o.y+52],[o.x+o.w,o.y+52]]);let t=d.ops.find(q=>q.kind==='text'&&q.x===o.x+10&&q.y===o.y+8);if(t){t.h=39;t.bold=true;t.size=22;d.text(o.x+10,o.y+56,o.w-20,o.h-60,o.s||({75:'delivery / request',355:'role-checked request',675:'receipt / balances'}[o.y]||'inventory data'),20);}}
frame(d,'UML','Stock Receiving Communication');

d=new D(15,'Interaction Overview Diagram',1060);
d.dot(450,70);d.box(250,105,400,55,'Open Inventory Workspace','round',23);d.edge([[450,82],[450,105]],'',0,0,0,'filled');
function mini(d,y,label,names,msg){d.box(40,y,820,230);d.text(55,y+7,790,35,'ref  '+label,23,true,'left');let xs=[180,450,730];names.forEach((s,i)=>{d.box(xs[i]-90,y+55,180,60,s,'rect',21);d.line([[xs[i],y+115],[xs[i],y+215]],'',true);});d.edge([[180,y+148],[450,y+148]],msg,190,y+111,250,'filled');d.edge([[450,y+193],[730,y+193]],'process request',475,y+150,230,'filled');}
mini(d,200,'1. Authenticate and authorize',['Inventory Staff','Access Checks','User Records'],'verify identity / role');d.edge([[450,160],[450,200]],'',0,0,0,'filled');
d.box(340,470,220,95,'Authorized?','diamond',23);d.edge([[450,430],[450,470]],'',0,0,0,'filled');d.box(675,487,185,70,'Show denied access','round',21);d.edge([[560,518],[675,518]],'No',570,471,90,'filled');d.dot(800,600,true);d.edge([[767,557],[800,588]],'',0,0,0,'filled');
mini(d,620,'2. Receive inventory stock (Figure 12)',['Receiving UI','Stock Service','Models / MySQL'],'submit delivery');d.edge([[450,565],[450,620]],'Yes',460,575,90,'filled');
d.box(185,920,530,80,'ref  3. Refresh inventory balances\nGET inventory data → display current stock','rect',23);d.edge([[450,850],[450,920]],'',0,0,0,'filled');d.dot(450,1040,true);d.edge([[450,1000],[450,1028]],'',0,0,0,'filled');frame(d,'UML','Inventory Interaction Overview');end(d,'Figure 15 combines activity decisions with the interactions used by the inventory module. Authentication precedes stock receiving, and a successful receipt is followed by a balance refresh. The receiving interaction is expanded in Figure 12; denied access ends the current attempt.');

d=new D(16,'Timing Diagram',850);
d.text(25,65,850,50,'Receive Stock: illustrative 0–4 second timeline',25,true);
let tx=t=>220+t*160;for(let t=0;t<=4;t+=0.5){d.line([[tx(t),150],[tx(t),710]],'',true);d.text(tx(t)-35,118,70,30,String(t),21);}d.edge([[220,150],[875,150]],'',0,0,0,'filled');
let tracks=[['Inventory Staff',[[0,.5,'Submit'],[3.5,4,'View']]],['Receiving UI',[[.25,.9,'Send'],[3.2,4,'Display result']]],['Access Checks',[[.5,1.3,'Authorize']]],['Stock Service',[[1.3,2,'Validate'],[2,3.2,'Receive stock']]],['Sequelize / MySQL',[[1.3,2,'Lock'],[2,3.2,'Write / commit']]]];
tracks.forEach(([s,events],i)=>{let y=235+i*105;d.box(15,y-45,175,80,s,'rect',22);let points=[[220,y]];for(let[a,b,label]of events){points.push([tx(a),y],[tx(a),y-40],[tx(b),y-40],[tx(b),y]);d.text(tx(a),y-85,(b-a)*160,40,label,20);}points.push([860,y]);d.line(points);});
d.text(20,765,860,55,'Times model the order of work; they are not measured performance targets.',22);frame(d,'UML','Inventory Timing Diagram');end(d,'Figure 16 models when each participant is active during a stock receipt: submission, authorization, validation, persistence, and display. The stepped timelines show how the interface, backend, and database coordinate. The four-second timeline is illustrative and does not represent measured response times.');

d=new D(17,'Requirement Diagram (SysML)',1100);
d.klass(180,30,540,'«requirement» INV-00',['Inventory Management','Support accurate, controlled stock operations.']);
let req=[['INV-01: Access Control','Approved Inventory / Admin\nmay change inventory.','Access Middleware'],['INV-02: Reliable Receiving','Commit related records together;\nrepeat requests do not duplicate stock.','Stock Receiving Service'],['INV-03: Safe Availability','Exclude expired / held batches\nand protect reserved stock.','Stock / Availability Services'],['INV-04: Controlled Counts','Reject stale counts and apply\nthe configured approval policy.','Count / Review Services'],['INV-05: Traceable History','Store quantity changes,\nactor, and reason.','Movement Records']];
req.forEach(([name,text,block],i)=>{let y=300+i*150;d.box(25,y,500,125);d.text(35,y+6,480,35,'«requirement» '+name,23,true);d.line([[25,y+45],[525,y+45]]);d.text(40,y+52,470,64,text,22,false,'left');d.box(655,y+5,225,115,'«component»\n'+block,'rect',22);d.edge([[655,y+65],[525,y+65]],'«satisfy»',530,y+14,120,'open',true);d.edge([[25,y+65],[10,y+65],[10,245],[450,245],[450,158]],'',0,0,0,'open',true);});
d.text(170,220,560,40,'«deriveReqt» toward the overall requirement',21);end(d,'Figure 17 derives the inventory module’s supporting requirements from its overall purpose. The requirements cover access control, reliable receiving, safe availability, controlled counts, and traceable history. Satisfy links identify the implementation elements responsible for these rules.');

// Component glyphs and framed interactions follow the reference's monochrome notation.
let all=[...new Map(ds.map(d=>[d.n,d])).values()].sort((a,b)=>a.n-b.n);
for(let dia of all){for(let o of [...dia.ops]){if(o.kind==='text'&&o.s.startsWith('«component»')){let x=o.x+o.w-17,y=o.y+8;dia.box(x,y,18,24);dia.box(x-5,y+4,9,6);dia.box(x-5,y+14,9,6);}}}
// The DFD uses numbered process compartments, as in the teacher's figure.
let flow=all.find(d=>d.n===9);for(let o of flow.ops.filter(o=>o.kind==='round')){let t=flow.ops.find(q=>q.kind==='text'&&q.x===o.x+10&&q.y===o.y+8);if(t){let num=t.s.slice(0,3);t.s=t.s.slice(4);t.y+=27;t.h-=27;flow.line([[o.x,o.y+30],[o.x+o.w,o.y+30]]);flow.text(o.x+5,o.y+1,o.w-10,27,num,22,true);}}
await fs.writeFile('C:/Users/ASUS/Desktop/Japz/output/inventory-diagrams-teacher-format/_work/diagrams.json',JSON.stringify(all,null,2));
console.log('Applied teacher-inspired visual structure to '+all.length+' diagrams.');
