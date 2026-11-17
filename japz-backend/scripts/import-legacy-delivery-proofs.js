import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { QueryTypes } from 'sequelize';

export const MAX_LEGACY_PROOF_BYTES = 6 * 1024 * 1024;
const DEFAULT_LEGACY_ROOT = fileURLToPath(new URL('../public/uploads/pod/', import.meta.url));
const LEGACY_PHOTO = /^\/uploads\/pod\/([a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp))$/i;
const MIME_BY_EXTENSION = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Read only a plain legacy POD filename, confined to the real upload directory. */
export async function readLegacyProof(url, root = DEFAULT_LEGACY_ROOT) {
  const match = typeof url === 'string' && LEGACY_PHOTO.exec(url);
  if (!match || match[1].includes('..')) throw new Error('Unsafe or unsupported legacy proof path.');
  const realRoot = await realpath(root);
  const realFile = await realpath(path.join(realRoot, match[1]));
  const relative = path.relative(realRoot, realFile);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Legacy proof resolves outside the proof directory.');
  }
  const handle = await open(realFile, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error('Legacy proof is not a regular file.');
    if (stat.size < 1 || stat.size > MAX_LEGACY_PROOF_BYTES) throw new Error('Legacy proof must contain 1 byte to 6MB.');
    // A fixed-size read also caps memory if a file grows after its stat check.
    const bytes = Buffer.alloc(Math.min(stat.size + 1, MAX_LEGACY_PROOF_BYTES + 1));
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length !== stat.size) throw new Error('Legacy proof changed while it was being read. Retry after it is stable.');
    return { buffer: bytes.subarray(0, length), mime: MIME_BY_EXTENSION[path.extname(match[1]).toLowerCase()] };
  } finally {
    await handle.close();
  }
}

/**
 * Dry-run by default. Only missing DB proof data can be populated; original
 * files and legacy URL values remain untouched. Injection keeps unit tests
 * independent of a configured database and the file-validation implementation.
 */
export async function importLegacyDeliveryProofs(sequelize, options = {}) {
  const { apply = false, root = DEFAULT_LEGACY_ROOT, onResult = () => {} } = options;
  const validate = options.validate || (await import('../services/deliveryTracking.js')).validateProofPhoto;
  const summary = { mode: apply ? 'apply' : 'dry-run', scanned: 0, eligible: 0, imported: 0, skipped: 0, failed: 0 };
  let lastId = 0;
  for (;;) {
    const rows = await sequelize.query(
      'SELECT id, proofPhotoUrl FROM deliveries WHERE id > :lastId AND proofPhotoData IS NULL AND proofPhotoUrl IS NOT NULL ORDER BY id ASC LIMIT 100',
      { replacements: { lastId }, type: QueryTypes.SELECT },
    );
    if (!rows.length) break;
    for (const row of rows) {
      lastId = row.id;
      summary.scanned++;
      try {
        const file = await readLegacyProof(row.proofPhotoUrl, root);
        const proof = validate(file.buffer, file.mime);
        summary.eligible++;
        if (!apply) {
          onResult({ id: row.id, status: 'eligible', bytes: proof.size });
          continue;
        }
        const imported = await sequelize.transaction(async transaction => {
          const current = await sequelize.query(
            'SELECT id, proofPhotoUrl FROM deliveries WHERE id = :id AND proofPhotoData IS NULL FOR UPDATE',
            { replacements: { id: row.id }, type: QueryTypes.SELECT, transaction },
          );
          // Respect another importer or a changed legacy source after our read.
          if (!current.length || current[0].proofPhotoUrl !== row.proofPhotoUrl) return false;
          await sequelize.query(
            'UPDATE deliveries SET proofPhotoData = :data, proofPhotoMime = :mime, proofPhotoSize = :size, proofPhotoSha256 = :sha256 WHERE id = :id AND proofPhotoData IS NULL',
            { replacements: { id: row.id, data: file.buffer, mime: proof.mime, size: proof.size, sha256: proof.sha256 }, transaction },
          );
          return true;
        });
        summary[imported ? 'imported' : 'skipped']++;
        onResult({ id: row.id, status: imported ? 'imported' : 'skipped', bytes: proof.size });
      } catch (error) {
        summary.failed++;
        onResult({ id: row.id, status: 'failed', error: error.message });
      }
    }
  }
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply' && arg !== '--dry-run') || (args.includes('--apply') && args.includes('--dry-run'))) {
    console.error('Usage: node scripts/import-legacy-delivery-proofs.js [--dry-run | --apply]');
    process.exitCode = 1;
  } else {
    const { sequelize } = await import('../models/db.js');
    try {
      const summary = await importLegacyDeliveryProofs(sequelize, {
        apply: args.includes('--apply'),
        onResult: result => console.log(JSON.stringify(result)),
      });
      console.log(JSON.stringify(summary));
      if (summary.failed) process.exitCode = 1;
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  }
}
