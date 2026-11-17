import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { QueryTypes } from 'sequelize';
import { legacyProofFilename, MAX_PROOF_BYTES } from '../services/deliveryTracking.js';

const DEFAULT_LEGACY_ROOT = fileURLToPath(new URL('../public/uploads/pod/', import.meta.url));
export const REQUIRED_DELIVERY_STORAGE_COLUMNS = Object.freeze([
  'proofPhotoData', 'proofPhotoMime', 'proofPhotoSize', 'proofPhotoSha256',
  'locationLat', 'locationLng', 'locationAccuracy', 'locationCapturedAt',
  'locationUpdatedAt', 'locationStoppedAt', 'locationSharing',
]);

/** Inspect a legacy reference using filesystem metadata only, without opening it. */
export async function inspectLegacyProofStat(value, root = DEFAULT_LEGACY_ROOT) {
  const filename = legacyProofFilename(value);
  if (!filename) return { status: 'unsafe', bytes: 0 };
  try {
    const realRoot = await realpath(root);
    const target = await realpath(path.join(realRoot, filename));
    const relative = path.relative(realRoot, target);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      return { status: 'unsafe', bytes: 0 };
    }
    const info = await stat(target);
    if (!info.isFile()) return { status: 'notRegular', bytes: 0 };
    if (info.size === 0) return { status: 'empty', bytes: 0 };
    if (info.size > MAX_PROOF_BYTES) return { status: 'oversized', bytes: info.size };
    return { status: 'confinedFiles', bytes: info.size };
  } catch (error) {
    return { status: error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 'missing' : 'unreadable', bytes: 0 };
  }
}

/**
 * Read-only schema/reference preflight. Binary proof data is never returned by
 * SQL and legacy files are only statted, so this is not an image validation or
 * a backup. The returned report contains no row ids, paths, URLs or identities.
 */
export async function inspectDeliveryStorage(sequelize, options = {}) {
  const report = {
    deliveryTableExists: true,
    requiredColumnCount: REQUIRED_DELIVERY_STORAGE_COLUMNS.length,
    missingColumns: [],
    totals: { deliveries: 0, databaseProofs: 0, legacyReferences: 0 },
    legacyFiles: { references: 0, confinedFiles: 0, bytes: 0, missing: 0, unsafe: 0, notRegular: 0, empty: 0, oversized: 0, unreadable: 0 },
  };
  let columns;
  try { columns = await sequelize.getQueryInterface().describeTable('deliveries', { logging: false }); }
  catch (error) {
    // MySQL/Sequelize signal a missing table differently for describeTable.
    const code = error.original?.code || error.parent?.code || error.code;
    if (code !== 'ER_NO_SUCH_TABLE' && !/No description found for|doesn.t exist|Unknown table/i.test(error.message || '')) throw error;
    report.deliveryTableExists = false;
    report.missingColumns = [...REQUIRED_DELIVERY_STORAGE_COLUMNS];
    return report;
  }
  report.missingColumns = REQUIRED_DELIVERY_STORAGE_COLUMNS.filter(name => !columns[name]);
  const hasData = Boolean(columns.proofPhotoData);
  const hasLegacy = Boolean(columns.proofPhotoUrl);
  const [totals] = await sequelize.query(
    `SELECT COUNT(*) AS deliveries, ${hasData ? 'COALESCE(SUM(proofPhotoData IS NOT NULL), 0)' : '0'} AS databaseProofs, ${hasLegacy ? 'COALESCE(SUM(proofPhotoUrl IS NOT NULL), 0)' : '0'} AS legacyReferences FROM deliveries`,
    { type: QueryTypes.SELECT, logging: false },
  );
  report.totals = Object.fromEntries(Object.keys(report.totals).map(key => [key, Number(totals?.[key] || 0)]));
  if (!hasLegacy) return report;
  let lastId = 0;
  for (;;) {
    const rows = await sequelize.query(
      'SELECT id, proofPhotoUrl FROM deliveries WHERE id > :lastId AND proofPhotoUrl IS NOT NULL ORDER BY id ASC LIMIT 100',
      { replacements: { lastId }, type: QueryTypes.SELECT, logging: false },
    );
    if (!rows.length) break;
    for (const row of rows) {
      lastId = row.id;
      const file = await inspectLegacyProofStat(row.proofPhotoUrl, options.root);
      report.legacyFiles.references++;
      report.legacyFiles[file.status]++;
      report.legacyFiles.bytes += file.bytes;
    }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) {
    console.error('Usage: node scripts/check-delivery-storage.js');
    process.exitCode = 1;
  } else {
    let sequelize;
    try {
      // db.js logs connection metadata on import; suppress that module's startup
      // log so this command's output stays limited to the aggregate report.
      const log = console.log;
      try {
        console.log = () => {};
        ({ sequelize } = await import('../models/db.js'));
      } finally { console.log = log; }
      console.log(JSON.stringify(await inspectDeliveryStorage(sequelize), null, 2));
    } catch {
      console.error('Delivery storage inspection failed. Check database access and schema configuration. No data was changed.');
      process.exitCode = 1;
    } finally {
      await sequelize?.close().catch(() => {});
    }
  }
}
