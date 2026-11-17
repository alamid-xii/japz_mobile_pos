import { test,expect,type Page } from '@playwright/test';
test.use({timezoneId:'America/Los_Angeles'});
async function setup(page:Page) {
  const date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const state = {
    hours:{openTime:'07:00:00',closeTime:'20:00:00',applyCashier:true,applyKitchen:true,autoClockOutEnabled:true},
    saved:{} as Record<string,unknown>,approval:{} as Record<string,unknown>,correction:{} as Record<string,unknown>,
    records:[{id:1,employeeId:2,employeeName:'Auto Staff',employeeRole:'cashier',date,clockIn:`${date}T07:00:00+08:00`,clockOut:`${date}T20:00:00+08:00`,totalHours:12,lateMinutes:0,undertimeMinutes:0,notes:'',status:'ON_TIME',clockOutSource:'auto',autoClockedOutAt:`${date}T20:00:00+08:00`,autoClockOutOriginalTime:`${date}T20:00:00+08:00`,overtimeApprovedAt:null as string | null,overtimeApprovedBy:null as number | null},
      {id:2,employeeId:3,employeeName:'Open Staff',employeeRole:'kitchen',date,clockIn:`${date}T07:00:00+08:00`,clockOut:null as string | null,totalHours:0,lateMinutes:0,undertimeMinutes:0,notes:'',status:'MISSING_CLOCK_OUT',clockOutSource:'manual',autoClockedOutAt:null as string | null,autoClockOutOriginalTime:null as string | null,overtimeApprovedAt:null as string | null,overtimeApprovedBy:null as number | null}],
  };
  await page.addInitScript(() => localStorage.setItem('authToken','admin-fixture'));
  await page.route('**/api/**',async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/user') return route.fulfill({json:{user:{id:90,name:'Owner',role:'admin',email:'owner@policy.test'}}});
    if (endpoint === '/api/business-hours') {
      if (route.request().method() === 'PUT') { state.saved = route.request().postDataJSON(); Object.assign(state.hours,state.saved); }
      return route.fulfill({json:state.hours});
    }
    if (endpoint.endsWith('/overtime')) {
      state.approval = route.request().postDataJSON();
      Object.assign(state.records[1],{overtimeApprovedAt:new Date().toISOString(),overtimeApprovedBy:90,overtimeApprovalReason:state.approval.reason});
      return route.fulfill({json:{success:true,data:state.records[1]}});
    }
    if (endpoint.endsWith('/correct')) {
      state.correction = route.request().postDataJSON(); Object.assign(state.records[0],state.correction,{clockOutSource:'corrected'});
      return route.fulfill({json:{success:true,data:state.records[0]}});
    }
    if (endpoint.endsWith('/records')) return route.fulfill({json:{success:true,data:state.records}});
    if (endpoint.includes('/validate')) return route.fulfill({json:{success:true,data:{isReady:true,issues:[],totalRecords:2}}});
    return route.fulfill({json:[]});
  });
  return state;
}
test.afterEach(async ({page}) => { await page.unrouteAll({behavior:'wait'}); });
test('Admin edits Philippine opening/closing hours and automatic clock-out independently of login role restrictions',async ({page}) => {
  const state = await setup(page); await page.goto('/admin/settings');
  await page.getByRole('button',{name:/Business Hours/}).click();
  await expect(page.getByLabel('Opening Time',{exact:true})).toHaveValue('07:00');
  await expect(page.getByLabel('Closing Time',{exact:true})).toHaveValue('20:00');
  await page.getByLabel('Closing Time',{exact:true}).fill('21:00');
  await page.getByRole('checkbox',{name:/Automatically clock out staff at closing/}).uncheck();
  await page.getByRole('button',{name:'Save Business Hours',exact:true}).click();
  await expect.poll(() => state.saved).toMatchObject({openTime:'07:00',closeTime:'21:00',autoClockOutEnabled:false});
});
test('owner corrects an automatic punch using PH time even on another device timezone',async ({page}) => {
  const state = await setup(page); await page.goto('/admin/attendance');
  await page.getByRole('button',{name:/All Shifts/}).click();
  const row = page.getByRole('row').filter({hasText:'Auto Staff'});
  await expect(row).toContainText('Auto clocked out'); await row.getByRole('button',{name:'Correct',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Correct Shift Attendance',exact:true});
  await expect(dialog.getByLabel('Clock Out (Philippine time)',{exact:true})).toHaveValue(state.records[0].date+'T20:00');
  await dialog.getByLabel('Clock Out (Philippine time)',{exact:true}).fill(state.records[0].date+'T20:30');
  await dialog.getByRole('button',{name:'Update Record',exact:true}).click();
  await expect.poll(() => state.correction.clockOut).toBe(state.records[0].date+'T20:30+08:00');
  await expect(row).toContainText('Auto clocked out · corrected');
});
test('manager approves overtime for an open shift with a required reason',async ({page}) => {
  const state = await setup(page); await page.goto('/admin/attendance'); await page.getByRole('button',{name:/All Shifts/}).click();
  await page.getByRole('row').filter({hasText:'Open Staff'}).getByRole('button',{name:'Correct',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Correct Shift Attendance',exact:true});
  await expect(dialog.getByRole('button',{name:'Save overtime decision',exact:true})).toBeDisabled();
  await dialog.getByRole('checkbox',{name:'Keep this shift open after closing time',exact:true}).check();
  await dialog.getByLabel('Overtime approval reason',{exact:true}).fill('Finish the approved late delivery');
  await dialog.getByRole('button',{name:'Save overtime decision',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('Overtime approved');
  expect(state.approval).toEqual({approved:true,reason:'Finish the approved late delivery'});
});
