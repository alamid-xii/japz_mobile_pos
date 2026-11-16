import { pathToFileURL } from 'node:url';
import { sequelize } from '../models/db.js';
import '../models/index.js';
import { preserveLegacyPayroll } from '../services/integrationSchema.js';

/** Explicit, repeatable migration. No force/alter sync, table drops or business-data seeds. */
export async function migrateIntegration(database = sequelize) {
  await database.authenticate();
  const plan = await preserveLegacyPayroll(database);
  // Creates absent tables in association order; existing tables and records are retained.
  await database.sync({ force: false, alter: false });
  const query = database.getQueryInterface();
  for (const model of Object.values(database.models)) {
    const table = model.getTableName();
    const columns = await query.describeTable(table);
    for (const [attribute, definition] of Object.entries(model.rawAttributes)) {
      const field = definition.field || attribute;
      if (columns[field]) {
        // Expand enums only; never remove an existing role/status value.
        if (definition.type?.key === 'ENUM') {
          const currentValues = [...String(columns[field].type).matchAll(/'((?:[^']|'')*)'/g)].map(match => match[1].replaceAll("''", "'"));
          const desired = definition.type.values;
          if (currentValues.length && desired.some(value => !currentValues.includes(value))) {
            const { DataTypes } = await import('sequelize');
            await query.changeColumn(table, field, { ...definition, type: DataTypes.ENUM(...new Set([...currentValues, ...desired])) });
          }
        }
        continue;
      }
      if (definition.allowNull === false && definition.defaultValue === undefined && await model.count() > 0) {
        throw new Error(`Cannot infer required ${String(table)}.${field} for existing records. Supply a separately reviewed backfill.`);
      }
      await query.addColumn(table, field, definition);
    }
    const existingIndexes = await query.showIndex(table);
    for (const index of model.options.indexes || []) {
      const fields = index.fields.map(field => typeof field === 'string' ? field : field.name || field.attribute);
      const exists = existingIndexes.some(existing => existing.fields.map(field => field.attribute).join(',') === fields.join(',') && (!index.unique || existing.unique));
      if (!exists) await query.addIndex(table, index);
    }
  }
  return plan;
}

export async function runIntegrationMigration() {
  try {
    const plan = await migrateIntegration();
    console.log('Integration schema ready. Archived legacy tables:', plan.archives.map(item => item.to).join(', ') || 'none');
  } catch (error) {
    console.error('Integration migration stopped:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runIntegrationMigration();
