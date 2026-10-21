import fs from 'node:fs/promises';
const root='C:/Users/ASUS/Desktop/Japz/output/inventory-diagrams-teacher-format';
const ds=JSON.parse(await fs.readFile(root+'/_work/diagrams.json','utf8'));
let d=ds.find(d=>d.n===1);
let t=d.ops.find(o=>o.s==='role check');t.x=530;t.w=185;
t=d.ops.find(o=>o.s?.startsWith('Inventory Database (MySQL)'));t.y=943;t.h=85;t.size=22;
d=ds.find(d=>d.n===8);
for(const o of d.ops.filter(o=>o.s?.startsWith('extends '))){o.x=o.x+18;o.w-=55;o.align='left';}
// Route the enumeration dependencies clear of metaclass annotations.
for(const o of d.ops.filter(o=>o.kind==='line'&&o.points?.[0]?.[1]===477)){
 if(o.points[0][0]===160)o.points=[[75,477],[75,665]];
 else o.points=[[850,477],[850,600],[455,600],[455,665]];
}
// The metaclass wording belongs beneath each stereotype, away from its typed-field dependency.
for(const o of d.ops.filter(o=>o.s?.startsWith('extends '))){o.y=560;o.h=35;o.size=21;}
d=ds.find(d=>d.n===12);
let box=d.ops.find(o=>o.kind==='rect'&&o.x===505&&o.y===490);box.y=475;box.h=225;
t=d.ops.find(o=>o.s==='loop  [each delivery line]');t.y=480;t.h=32;
t=d.ops.find(o=>o.s==='5. validate / convert');t.y=518;t.h=32;
// Validation is a service self-operation; persistence is the database call.
let msg=d.ops.find(o=>o.kind==='line'&&o.points?.[0]?.[0]===555&&o.points?.[0]?.[1]===550);
msg.points=[[555,550],[607,550],[607,579],[555,579]];
d=ds.find(d=>d.n===13);
t=d.ops.find(o=>o.s==='Admin rejects');t.x=25;t.w=130;t.align='left';
t=d.ops.find(o=>o.s==='Yes / approve');t.x=575;t.w=150;t.align='left';
// Record a clean read-only structural validation receipt.
if(ds.length!==17||new Set(ds.map(d=>d.n)).size!==17)throw new Error('Diagram count mismatch');
await fs.writeFile(root+'/_work/diagrams.json',JSON.stringify(ds,null,2));
console.log('Polished connector labels and UML message placement.');
