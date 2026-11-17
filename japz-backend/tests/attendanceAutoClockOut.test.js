import test,{ before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const database = `japz_attendance_test_${Date.now()}_${process.pid}`;
let connection,sequelize,models,service,auto,hours,server,base,admin,staff,adminToken,staffToken;
before(async () => {
  connection = await mysql.createConnection({host:process.env.DB_HOST || '127.0.0.1',port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
  await connection.query(`CREATE DATABASE \`${database}\``);
  for (const key of Object.keys(process.env)) if (key.startsWith('MYSQL') || key === 'DATABASE_URL') delete process.env[key];
  Object.assign(process.env,{DB_DATABASE:database,JWT_SECRET:crypto.randomBytes(48).toString('base64url'),BOOTSTRAP_ADMIN_EMAIL:'owner@attendance.test',BOOTSTRAP_ADMIN_PASSWORD:crypto.randomBytes(24).toString('base64url'),ELECTRON:'1',NODE_ENV:'test',TZ:'UTC'});
  const app = (await import('../index.js')).default;
  ({sequelize} = await import('../models/db.js'));
  models = await import('../models/index.js');
  service = await import('../services/attendanceService.js');
  auto = await import('../services/attendanceAutoClockOut.js');
  admin = await models.User.findOne({where:{role:'admin'}});
  staff = await models.User.create({name:'Cook',email:'cook@attendance.test',phone:'09123456789',password:await bcrypt.hash('AttendanceTestPassword123!',4),role:'kitchen',status:'approved'});
  adminToken = jwt.sign({id:admin.id,role:admin.role},process.env.JWT_SECRET);
  staffToken = jwt.sign({id:staff.id,role:staff.role},process.env.JWT_SECRET);
  hours = await models.BusinessHours.create({openTime:'07:00:00',closeTime:'20:00:00',autoClockOutEnabled:true});
  server = app.listen(0,'127.0.0.1'); await new Promise(resolve => server.once('listening',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => { await models.Attendance.destroy({where:{}}); await models.PayrollPeriod.destroy({where:{}}); await models.Log.destroy({where:{module:'attendance'}}); await hours.update({openTime:'07:00:00',closeTime:'20:00:00',autoClockOutEnabled:true}); });
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (sequelize) await sequelize.close();
  if (connection) { assert.match(database,/^japz_attendance_test_\d+_\d+$/); await connection.query(`DROP DATABASE \`${database}\``); await connection.end(); }
});
const punch = () => service.clockIn(staff.id,'2026-11-17T01:00:00Z');
const request = (path,token,body) => fetch(base+path,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
test('closes only due open shifts, computes hours and records one audit entry across concurrent workers',async () => {
  const record = await punch();
  assert.equal((await auto.autoClockOutDueShifts({now:new Date('2026-11-17T11:59:59Z')})).closed,0);
  const results = await Promise.all([auto.autoClockOutDueShifts({now:new Date('2026-11-17T12:00Z')}),auto.autoClockOutDueShifts({now:new Date('2026-11-17T12:00Z')})]);
  assert.equal(results.reduce((sum,result) => sum+result.closed,0),1);
  await record.reload(); assert.equal(record.clockOut.toISOString(),'2026-11-17T12:00:00.000Z');
  assert.equal(record.clockOutSource,'auto'); assert.equal(Number(record.totalHours),10);
  assert.equal(await models.Log.count({where:{entityId:record.id,module:'attendance',userName:'System scheduler'}}),1);
});
test('payroll overtime eligibility alone is not an approval; only an admin can approve this shift',async () => {
  const record = await punch();
  assert.equal((await request(`/api/attendance/${record.id}/overtime`,staffToken,{approved:true,reason:'Late order'})).status,403);
  assert.equal((await request(`/api/attendance/${record.id}/overtime`,adminToken,{approved:true,reason:''})).status,400);
  assert.equal((await request(`/api/attendance/${record.id}/overtime`,adminToken,{approved:true,reason:'Finish the approved late order'})).status,200);
  const login = await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:staff.email,password:'AttendanceTestPassword123!'})});
  assert.equal(login.status,200); assert.equal((await login.json()).overtimeApprovedForShift,true);
  assert.equal((await auto.autoClockOutDueShifts({now:new Date('2026-11-17T13:00Z')})).closed,0);
  await record.reload(); assert.equal(record.clockOut,null); assert.equal(record.overtimeApprovedBy,admin.id);
  await service.clockOut(staff.id,'2026-11-17T13:00Z');
  await record.reload(); assert.equal(record.clockOutSource,'manual');
  const signedOutShift = await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:staff.email,password:'AttendanceTestPassword123!'})});
  assert.equal((await signedOutShift.json()).overtimeApprovedForShift,false);
});
test('the owner can correct an automatic punch and its original automatic time stays intact',async () => {
  const record = await punch(); await auto.autoClockOutDueShifts({now:new Date('2026-11-17T12:00Z')});
  const response = await request(`/api/attendance/${record.id}/correct`,adminToken,{clockOut:'2026-11-17T20:30:00+08:00',notes:'Owner verified actual departure'});
  assert.equal(response.status,200,await response.text());
  await record.reload(); assert.equal(record.clockOut.toISOString(),'2026-11-17T12:30:00.000Z');
  assert.equal(record.autoClockOutOriginalTime.toISOString(),'2026-11-17T12:00:00.000Z'); assert.equal(record.clockOutSource,'corrected'); assert.ok(record.autoClockedOutAt);
  assert.equal(Number(record.totalHours),10.5);
});
test('admin-edited hours and the enable switch control the job; malformed hours are rejected',async () => {
  const record = await punch();
  assert.equal((await request('/api/business-hours',adminToken,{closeTime:'25:99'})).status,400);
  assert.equal((await request('/api/business-hours',staffToken,{closeTime:'21:00'})).status,403);
  assert.equal((await request('/api/business-hours',adminToken,{openTime:'07:00',closeTime:'21:00',autoClockOutEnabled:true})).status,200);
  assert.equal((await auto.autoClockOutDueShifts({now:new Date('2026-11-17T12:30Z')})).closed,0);
  await hours.reload(); await hours.update({autoClockOutEnabled:false});
  assert.equal((await auto.autoClockOutDueShifts({now:new Date('2026-11-17T14:00Z')})).closed,0);
  await hours.update({autoClockOutEnabled:true});
  assert.equal((await auto.autoClockOutDueShifts({now:new Date('2026-11-17T14:00Z')})).closed,1);
  await record.reload(); assert.equal(record.clockOut.toISOString(),'2026-11-17T13:00:00.000Z');
});
test('restart catch-up uses the missed closing time, never the later server restart time',async () => {
  const record = await punch();
  await auto.autoClockOutDueShifts({now:new Date('2026-11-19T14:00Z')}); await record.reload();
  assert.equal(record.clockOut.toISOString(),'2026-11-17T12:00:00.000Z');
  assert.equal((await auto.autoClockOutDueShifts({now:new Date('2026-11-19T15:00Z')})).closed,0);
});
test('the additive migration preserves an existing record and is repeatable without changing financial schemas',async () => {
  const record = await punch(); await record.update({notes:'Preserve this record'});
  const query = sequelize.getQueryInterface();
  const before = await Promise.all(['payroll_periods','payslips','reservations'].map(name => query.describeTable(name)));
  for (const field of ['clockOutSource','autoClockedOutAt','autoClockOutOriginalTime','overtimeApprovedAt','overtimeApprovedBy','overtimeApprovalReason']) await query.removeColumn('Attendances',field);
  await query.removeColumn('business_hours','autoClockOutEnabled');
  const {runAttendanceAutoClockOutMigration} = await import('../migrations/add-attendance-auto-clock-out.js');
  await runAttendanceAutoClockOutMigration(sequelize); await runAttendanceAutoClockOutMigration(sequelize);
  await record.reload(); assert.equal(record.notes,'Preserve this record'); assert.equal(record.clockOut,null); assert.equal(record.clockOutSource,'manual');
  const after = await Promise.all(['payroll_periods','payslips','reservations'].map(name => query.describeTable(name)));
  assert.deepEqual(after,before);
});
test('approved payroll is preserved until the owner reopens the period',async () => {
  const record = await punch();
  const period = await models.PayrollPeriod.create({periodStart:'2026-11-01',periodEnd:'2026-11-30',status:'LOCKED',createdBy:admin.id});
  const result = await auto.autoClockOutDueShifts({now:new Date('2026-11-17T12:00Z')});
  assert.equal(result.closed,0); assert.equal(result.skippedProtected,1);
  const response = await request(`/api/attendance/${record.id}/correct`,adminToken,{clockOut:'2026-11-17T20:30:00+08:00'});
  assert.equal(response.status,400); assert.match((await response.json()).message,/Reopen/);
  await record.reload(); assert.equal(record.clockOut,null);
  await assert.rejects(() => service.clockOut(staff.id,'2026-11-17T13:00Z'),/Reopen/);
  await period.update({status:'DRAFT'});
  assert.equal((await auto.autoClockOutDueShifts({now:new Date('2026-11-17T12:00Z')})).closed,1);
});
