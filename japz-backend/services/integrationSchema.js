/** Approved integration policy: preserve financial history and fail on unknown layouts. */
export const PROTECTED_TABLES = {
  payroll_periods: {
    canonical: ['id', 'periodStart', 'periodEnd', 'status', 'createdBy'],
    legacy: ['id', 'label', 'startDate', 'endDate', 'status'],
    archive: 'legacy_online_payroll_periods',
  },
  payslips: {
    canonical: ['id', 'payrollEntryId', 'employeeId', 'generatedAt', 'generatedBy'],
    legacy: ['id', 'periodId', 'userId', 'grossPay', 'netPay'],
    archive: 'legacy_online_payslips',
  },
  reservations: {
    canonical: ['id', 'code', 'customerName', 'reservationDate', 'startTime', 'partySize', 'tableId'],
  },
};

export function planProtectedSchema(tables) {
  const archives = [];
  for (const [name, definition] of Object.entries(PROTECTED_TABLES)) {
    const columns = tables[name];
    if (!columns) continue;
    const has = keys => keys.every(key => Object.hasOwn(columns, key));
    const canonical = has(definition.canonical);
    const legacy = definition.legacy && has(definition.legacy);
    if (canonical && !legacy) continue;
    if (legacy && !canonical) {
      if (tables[definition.archive]) throw new Error(`Archive ${definition.archive} already exists; refusing to overwrite payroll history.`);
      archives.push({ from: name, to: definition.archive });
      continue;
    }
    throw new Error(`Unsupported or mixed ${name} schema. A separate reviewed data conversion is required.`);
  }
  // An online payslip must keep its original parent period, never a new canonical period.
  const periodIsLegacy = archives.some(item => item.from === 'payroll_periods');
  const slipIsLegacy = archives.some(item => item.from === 'payslips');
  if (slipIsLegacy && !periodIsLegacy) throw new Error('Legacy payslips require their legacy payroll periods; refusing a mixed payroll migration.');
  if (periodIsLegacy && tables.payslips && !slipIsLegacy) throw new Error('Legacy payroll periods cannot be combined with canonical payslips.');
  return { archives };
}

export async function inspectProtectedSchema(sequelize) {
  const query = sequelize.getQueryInterface();
  const names = (await query.showAllTables()).map(name => typeof name === 'string' ? name : name.tableName);
  const tables = {};
  for (const name of [...Object.keys(PROTECTED_TABLES), 'legacy_online_payroll_periods', 'legacy_online_payslips']) {
    const actual = names.find(item => item.toLowerCase() === name.toLowerCase());
    tables[name] = actual ? await query.describeTable(actual) : null;
  }
  return planProtectedSchema(tables);
}

export async function assertProtectedSchemaReady(sequelize) {
  const plan = await inspectProtectedSchema(sequelize);
  if (plan.archives.length) throw new Error('Legacy online payroll detected. Run the explicit integration migration after backing up the database; automatic startup conversion is disabled.');
}

export async function preserveLegacyPayroll(sequelize) {
  const plan = await inspectProtectedSchema(sequelize);
  if (plan.archives.length) {
    const generator = sequelize.getQueryInterface().queryGenerator;
    const clauses = plan.archives.map(({ from, to }) => `${generator.quoteTable(from)} TO ${generator.quoteTable(to)}`);
    // MySQL renames all listed tables atomically, retaining rows and foreign-key relationships.
    await sequelize.query(`RENAME TABLE ${clauses.join(', ')}`);
  }
  return plan;
}
