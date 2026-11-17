import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runDeliveryLiveTrackingMigration } from '../migrations/add-delivery-live-tracking.js';
import { importLegacyDeliveryProofs, readLegacyProof, MAX_LEGACY_PROOF_BYTES } from '../scripts/import-legacy-delivery-proofs.js';

const validate = (buffer, mime) => ({ mime, size: buffer.length, sha256: 'a'.repeat(64) });
async function withProofDirectory(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'japz-delivery-import-test-'));
  try { await run(root); }
  finally {
    assert.ok(path.basename(root).startsWith('japz-delivery-import-test-'));
    await rm(root, { recursive: true, force: true });
  }
}

test('delivery migration is additive, repeatable, and confined to deliveries', async () => {
  const columns = { id: {}, proofPhotoUrl: {} };
  const additions = [];
  const db = { getQueryInterface: () => ({
    showAllTables: async () => ['deliveries', 'payroll_periods', 'reservations'],
    describeTable: async table => { assert.equal(table, 'deliveries'); return columns; },
    addColumn: async (table, name, definition) => { assert.equal(table, 'deliveries'); additions.push(name); columns[name] = definition; },
  }) };
  const result = await runDeliveryLiveTrackingMigration(db);
  assert.equal(result.added.length, 11);
  assert.equal(columns.proofPhotoData.type.toSql(), 'LONGBLOB');
  assert.equal(columns.locationSharing.defaultValue, false);
  assert.deepEqual((await runDeliveryLiveTrackingMigration(db)).added, []);
  assert.equal(additions.length, 11);
  assert.ok(columns.proofPhotoUrl);
});

test('delivery migration fails before mutation if the existing delivery table is missing', async () => {
  let changed = false;
  const db = { getQueryInterface: () => ({ showAllTables: async () => ['orders'], addColumn: async () => { changed = true; } }) };
  await assert.rejects(() => runDeliveryLiveTrackingMigration(db), /deliveries table is missing/);
  assert.equal(changed, false);
});

test('legacy proof reader accepts confined files and rejects traversal, URL extras and oversized files', async () => {
  await withProofDirectory(async root => {
    await writeFile(path.join(root, 'pod-safe.jpg'), Buffer.from([1, 2, 3]));
    const result = await readLegacyProof('/uploads/pod/pod-safe.jpg', root);
    assert.equal(result.mime, 'image/jpeg');
    assert.deepEqual(result.buffer, Buffer.from([1, 2, 3]));
    for (const url of ['/uploads/pod/../secret.jpg', '/uploads/pod/%2e%2e.jpg', '/uploads/pod/a..jpg', '/uploads/pod/pod-safe.jpg?token=1', '/other/pod-safe.jpg', 'https://host/uploads/pod/pod-safe.jpg']) {
      await assert.rejects(() => readLegacyProof(url, root), /Unsafe or unsupported/);
    }
    await writeFile(path.join(root, 'large.png'), Buffer.alloc(MAX_LEGACY_PROOF_BYTES + 1));
    await assert.rejects(() => readLegacyProof('/uploads/pod/large.png', root), /6MB/);
    await writeFile(path.join(root, 'empty.png'), Buffer.alloc(0));
    await assert.rejects(() => readLegacyProof('/uploads/pod/empty.png', root), /6MB/);
  });
});

test('legacy proof reader prevents directory links escaping its upload root', async t => {
  await withProofDirectory(async root => {
    const actual = path.join(root, 'actual');
    const uploads = path.join(root, 'uploads');
    await mkdir(actual);
    await mkdir(uploads);
    await writeFile(path.join(actual, 'outside.png'), Buffer.from([1]));
    try {
      await symlink(path.join(actual, 'outside.png'), path.join(uploads, 'escaped.png'), 'file');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'ENOSYS') { t.skip('OS does not allow unprivileged file symlinks.'); return; }
      throw error;
    }
    await assert.rejects(() => readLegacyProof('/uploads/pod/escaped.png', uploads), /outside the proof directory/);
  });
});

test('legacy import defaults to dry-run and never writes or starts a transaction', async () => {
  await withProofDirectory(async root => {
    await writeFile(path.join(root, 'photo.jpg'), Buffer.from([1, 2]));
    const db = {
      query: async (sql, options) => {
        assert.match(sql, /^SELECT id, proofPhotoUrl FROM deliveries/);
        assert.match(sql, /proofPhotoData IS NULL/);
        return options.replacements.lastId === 0 ? [{ id: 7, proofPhotoUrl: '/uploads/pod/photo.jpg' }] : [];
      },
      transaction: () => assert.fail('A dry-run cannot start a write transaction.'),
    };
    const summary = await importLegacyDeliveryProofs(db, { root, validate });
    assert.deepEqual(summary, { mode: 'dry-run', scanned: 1, eligible: 1, imported: 0, skipped: 0, failed: 0 });
    assert.equal((await readLegacyProof('/uploads/pod/photo.jpg', root)).buffer.length, 2);
  });
});

test('legacy apply locks and rechecks missing data, preserves source URL, and skips competing imports', async () => {
  await withProofDirectory(async root => {
    await writeFile(path.join(root, 'photo.jpg'), Buffer.from([1, 2]));
    for (const alreadyImported of [false, true]) {
      const mutations = [];
      const transaction = { name: 'test' };
      const db = {
        query: async (sql, options) => {
          if (sql.includes('id > :lastId')) return options.replacements.lastId === 0 ? [{ id: 7, proofPhotoUrl: '/uploads/pod/photo.jpg' }] : [];
          assert.equal(options.transaction, transaction);
          if (sql.includes('FOR UPDATE')) return alreadyImported ? [] : [{ id: 7, proofPhotoUrl: '/uploads/pod/photo.jpg' }];
          mutations.push(sql);
          assert.match(sql, /WHERE id = :id AND proofPhotoData IS NULL$/);
          assert.equal(options.replacements.mime, 'image/jpeg');
          assert.equal(options.replacements.size, 2);
          assert.ok(Buffer.isBuffer(options.replacements.data));
          assert.ok(!sql.includes('proofPhotoUrl ='));
          return [];
        },
        transaction: callback => callback(transaction),
      };
      const result = await importLegacyDeliveryProofs(db, { root, validate, apply: true });
      assert.equal(result.imported, alreadyImported ? 0 : 1);
      assert.equal(result.skipped, alreadyImported ? 1 : 0);
      assert.equal(mutations.length, alreadyImported ? 0 : 1);
    }
  });
});

test('invalid legacy images are reported and do not prevent inspecting later records', async () => {
  await withProofDirectory(async root => {
    await writeFile(path.join(root, 'photo.jpg'), Buffer.from([1]));
    const results = [];
    const db = { query: async (sql, options) => options.replacements.lastId === 0 ? [
      { id: 1, proofPhotoUrl: '/uploads/pod/missing.png' },
      { id: 2, proofPhotoUrl: '/uploads/pod/photo.jpg' },
    ] : [] };
    const result = await importLegacyDeliveryProofs(db, { root, validate, onResult: item => results.push(item) });
    assert.equal(result.failed, 1);
    assert.equal(result.eligible, 1);
    assert.deepEqual(results.map(item => item.status), ['failed', 'eligible']);
  });
});
