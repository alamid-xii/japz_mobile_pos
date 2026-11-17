import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectDeliveryStorage, inspectLegacyProofStat, REQUIRED_DELIVERY_STORAGE_COLUMNS } from '../scripts/check-delivery-storage.js';

async function withRoot(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'japz-delivery-check-test-'));
  try { await run(root); }
  finally {
    assert.ok(path.basename(root).startsWith('japz-delivery-check-test-'));
    await rm(root, { recursive: true, force: true });
  }
}
const readyColumns = () => Object.fromEntries(['id', 'proofPhotoUrl', ...REQUIRED_DELIVERY_STORAGE_COLUMNS].map(name => [name, {}]));

test('delivery preflight reports missing migration columns without reading BLOB values or changing data', async () => {
  const statements = [];
  const db = {
    getQueryInterface: () => ({ describeTable: async (table, options) => {
      assert.equal(table, 'deliveries'); assert.equal(options.logging, false);
      return { id: {}, proofPhotoUrl: {} };
    } }),
    query: async (sql, options) => {
      statements.push(sql);
      assert.match(sql, /^SELECT /);
      assert.equal(options.logging, false);
      assert.ok(!sql.includes('proofPhotoData'));
      return sql.startsWith('SELECT COUNT') ? [{ deliveries: '7', databaseProofs: '0', legacyReferences: '0' }] : [];
    },
    transaction: () => assert.fail('Inspection cannot start write transactions.'),
  };
  const report = await inspectDeliveryStorage(db);
  assert.equal(report.requiredColumnCount, 11);
  assert.deepEqual(report.missingColumns, REQUIRED_DELIVERY_STORAGE_COLUMNS);
  assert.deepEqual(report.totals, { deliveries: 7, databaseProofs: 0, legacyReferences: 0 });
  assert.ok(statements.length > 0);
});

test('delivery preflight summarizes private legacy metadata without including ids, URLs or file paths', async () => {
  await withRoot(async root => {
    const privateFilename = 'private-customer-name.png';
    await writeFile(path.join(root, privateFilename), Buffer.from([1, 2, 3]));
    await writeFile(path.join(root, 'empty.jpg'), Buffer.alloc(0));
    await mkdir(path.join(root, 'directory.webp'));
    const rows = [
      { id: 5001, proofPhotoUrl: `/uploads/pod/${privateFilename}` },
      { id: 5002, proofPhotoUrl: '/uploads/pod/missing.jpg' },
      { id: 5003, proofPhotoUrl: '/uploads/pod/../secret.jpg' },
      { id: 5004, proofPhotoUrl: '/uploads/pod/empty.jpg' },
      { id: 5005, proofPhotoUrl: '/uploads/pod/directory.webp' },
    ];
    const db = {
      getQueryInterface: () => ({ describeTable: async () => readyColumns() }),
      query: async (sql, options) => {
        assert.match(sql, /^SELECT /);
        assert.equal(options.logging, false);
        assert.ok(!/^SELECT\s+(?:\*|proofPhotoData\b)/i.test(sql));
        if (sql.startsWith('SELECT COUNT')) return [{ deliveries: 10, databaseProofs: 4, legacyReferences: rows.length }];
        return options.replacements.lastId === 0 ? rows : [];
      },
    };
    const report = await inspectDeliveryStorage(db, { root });
    assert.deepEqual(report.missingColumns, []);
    assert.deepEqual(report.legacyFiles, { references: 5, confinedFiles: 1, bytes: 3, missing: 1, unsafe: 1, notRegular: 1, empty: 1, oversized: 0, unreadable: 0 });
    const encoded = JSON.stringify(report);
    for (const hidden of [privateFilename, root, '/uploads/', '5001', '5002', 'secret.jpg']) assert.ok(!encoded.includes(hidden));
  });
});

test('delivery preflight handles a missing delivery table without any SELECT or mutation', async () => {
  const db = {
    getQueryInterface: () => ({ describeTable: async () => { throw Object.assign(new Error('Missing table'), { original: { code: 'ER_NO_SUCH_TABLE' } }); } }),
    query: () => assert.fail('A missing table cannot be queried.'),
  };
  const report = await inspectDeliveryStorage(db);
  assert.equal(report.deliveryTableExists, false);
  assert.equal(report.missingColumns.length, 11);
});

test('delivery preflight does not mistake an access error for a missing table', async () => {
  const db = { getQueryInterface: () => ({ describeTable: async () => { throw new Error('Access denied'); } }) };
  await assert.rejects(() => inspectDeliveryStorage(db), /Access denied/);
});

test('legacy metadata inspection rejects traversal and reports missing files without opening them', async () => {
  await withRoot(async root => {
    assert.deepEqual(await inspectLegacyProofStat('/uploads/pod/../outside.png', root), { status: 'unsafe', bytes: 0 });
    assert.deepEqual(await inspectLegacyProofStat('/uploads/pod/missing.png', root), { status: 'missing', bytes: 0 });
  });
});
