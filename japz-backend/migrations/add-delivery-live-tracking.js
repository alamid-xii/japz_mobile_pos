import { DataTypes } from 'sequelize';
import { pathToFileURL } from 'node:url';

/** Delivery-only, additive and repeatable. No existing records are changed. */
export async function runDeliveryLiveTrackingMigration(sequelize) {
  const query = sequelize.getQueryInterface();
  const tables = (await query.showAllTables()).map(value => typeof value === 'string' ? value : value.tableName);
  const table = tables.find(name => name.toLowerCase() === 'deliveries');
  if (!table) throw new Error('Required deliveries table is missing. Set up the existing delivery workflow schema first.');
  const columns = await query.describeTable(table);
  const fields = {
    proofPhotoData: { type: DataTypes.BLOB('long'), allowNull: true },
    proofPhotoMime: { type: DataTypes.STRING(32), allowNull: true },
    proofPhotoSize: { type: DataTypes.INTEGER, allowNull: true },
    proofPhotoSha256: { type: DataTypes.CHAR(64), allowNull: true },
    locationLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    locationLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    locationAccuracy: { type: DataTypes.FLOAT, allowNull: true },
    locationCapturedAt: { type: DataTypes.DATE(3), allowNull: true },
    locationUpdatedAt: { type: DataTypes.DATE(3), allowNull: true },
    locationStoppedAt: { type: DataTypes.DATE(3), allowNull: true },
    locationSharing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  };
  const added = [];
  for (const [name, definition] of Object.entries(fields)) {
    if (!columns[name]) {
      await query.addColumn(table, name, definition);
      added.push(name);
    }
  }
  return { table, added };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { sequelize } = await import('../models/db.js');
  try {
    const result = await runDeliveryLiveTrackingMigration(sequelize);
    console.log(`Delivery tracking schema ready (${result.added.length} columns added). Existing delivery proofs and all other tables preserved.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
