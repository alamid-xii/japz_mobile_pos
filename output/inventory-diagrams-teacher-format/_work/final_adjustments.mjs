import fs from 'node:fs/promises';
const root='C:/Users/ASUS/Desktop/Japz/output/inventory-diagrams-teacher-format';
const ds=JSON.parse(await fs.readFile(root+'/_work/diagrams.json','utf8'));
let d=ds.find(d=>d.n===3);
for(const o of d.ops.filter(o=>o.kind==='text'&&o.s.startsWith('«component»'))){o.w-=42;o.size=21;if(o.s==='«component» Inventory Services')o.s='«component» Stock Services';}
let t=d.ops.find(o=>o.s==='Authentication interface');t.s='Authenticated\nrequests';t.x=475;t.y=403;t.w=175;t.h=60;
// Keep database text below its top ellipse.
t=d.ops.find(o=>o.s==='«database»\nMySQL Inventory Records');t.y=906;t.h=70;
d=ds.find(d=>d.n===4);t=d.ops.find(o=>o.s==='Sequelize / SQL');t.x=270;t.y=795;t.w=320;t.h=32;
d=ds.find(d=>d.n===5);t=d.ops.find(o=>o.s?.includes('purchaseQuantity = 5; unit = kg'));t.s=t.s.replace('unit = kg','purchaseUnit = kg');t.size=20;
d=ds.find(d=>d.n===8);t=d.ops.find(o=>o.s==='extends Class');t.x=100;t.w=180;
let path=d.ops.find(o=>o.kind==='line'&&o.points?.[0]?.[0]===850&&o.points?.[0]?.[1]===477);path.points=[[850,477],[850,600],[600,600],[600,730],[590,730]];
d.ops=d.ops.filter(o=>o.s!=='Documentation conventions; no runtime UML profile is installed.');
d=ds.find(d=>d.n===9);
let move=d.ops.find(o=>o.kind==='line'&&o.points?.[0]?.[0]===845);move.points[0][0]=865;
d.ops.push({kind:'text',x:680,y:535,w:195,h:38,s:'movement entries',size:21,align:'center'});
d.ops.push({kind:'text',x:406,y:689,w:90,h:32,s:'history',size:20,align:'center'});
// Delivery transactions also update the item balance store.
d.ops.push({kind:'line',points:[[495,282],[435,282],[435,385],[380,385],[380,410]],arrow:'filled',dash:false});
d.ops.push({kind:'text',x:255,y:346,w:205,h:32,s:'updated balances',size:21,align:'center'});
for(const o of d.ops.filter(o=>o.kind==='store')){let text=d.ops.find(q=>q.kind==='text'&&q.x===o.x+10&&q.y===o.y+8);let code=text.s.slice(0,2);text.s=text.s.slice(4);text.x=o.x+49;text.w=o.w-60;d.ops.push({kind:'text',x:o.x+2,y:o.y+12,w:35,h:o.h-24,s:code,size:19,align:'center'});}
d=ds.find(d=>d.n===10);
d.ops.push({kind:'ellipse',x:220,y:930,w:335,h:60},{kind:'text',x:230,y:938,w:315,h:44,s:'Configure inventory settings',size:22,align:'center'},{kind:'line',points:[[110,493],[220,960]],arrow:'',dash:false});
d=ds.find(d=>d.n===11);d.caption='Main Activity Flow of the Inventory Module';
// Show the user's mutually exclusive choice as a decision, rather than a concurrent fork.
let select=d.ops.find(o=>o.kind==='round'&&o.y===440);select.kind='diamond';select.x=345;select.w=210;select.h=90;
t=d.ops.find(o=>o.s==='Choose inventory function');t.s='Choose\nfunction';t.x=355;t.w=190;t.h=74;
let left=d.ops.find(o=>o.kind==='line'&&o.points?.some(p=>p[1]===595)&&o.points[0][0]===450);left.points=[[345,485],[235,485],[235,595]];
let right=d.ops.find(o=>o.kind==='line'&&o.points?.[0]?.[1]===545&&o.points?.[1]?.[0]===685);right.points=[[555,485],[685,485],[685,595]];
d.ops.push({kind:'text',x:35,y:533,w:235,h:32,s:'[Stock operation]',size:21,align:'center'},{kind:'text',x:650,y:533,w:220,h:32,s:'[View / report]',size:21,align:'center'});
d=ds.find(d=>d.n===12);for(const o of d.ops.filter(o=>o.kind==='text'&&/Return the original receipt|Rollback transaction/.test(o.s)))o.background=true;
d=ds.find(d=>d.n===16);d.caption='Timing of the Stock Receiving Process';for(const o of d.ops.filter(o=>o.kind==='text'&&o.size===20))o.background=true;
d=ds.find(d=>d.n===17);for(const o of d.ops.filter(o=>o.kind==='line'&&o.points?.[0]?.[0]===25)){o.points=o.points.slice(0,2);o.arrow='';}
d.ops.push({kind:'line',points:[[10,965],[10,245],[450,245],[450,158]],arrow:'open',dash:true});
t=d.ops.find(o=>o.s?.startsWith('«deriveReqt» toward'));t.s='«deriveReqt»';t.x=180;t.y=195;t.w=260;t.h=32;
await fs.writeFile(root+'/_work/diagrams.json',JSON.stringify(ds,null,2));
console.log('Completed final layout and notation corrections.');
