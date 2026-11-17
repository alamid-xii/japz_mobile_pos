import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { blockPublicProofFiles } from '../middleware/privateProofFiles.js';

const privatePaths = [
  '/uploads/pod/legacy.png', '/uploads/POD/legacy.png', '/uploads%2fpod/legacy.png',
  '/uploads/%70od/legacy.png', '/uploads%5cpod%5clegacy.png',
  '/uploads/pod./legacy.png', '/uploads/pod%20/legacy.png', '/uploads/pod.%20/legacy.png',
  '/uploads/pod.../legacy.png', '/uploads/pod%20.%20/legacy.png',
  '/uploads./pod/legacy.png', '/uploads%20/pod/legacy.png',
  '/uploads/temporary/..%20/pod/legacy.png', '/uploads/pod/.%20/legacy.png',
  '/temporary/..%20/uploads/pod/legacy.png', '/temporary/..%20/uploads.%20/pod/legacy.png',
  '/uploads/pod::$INDEX_ALLOCATION/legacy.png', '/uploads/pod/legacy.png::$DATA',
  '/uploads/pod.', '/uploads/pod%20', '/uploads/pod',
];

test('proof guard blocks Win32 aliases without changing ordinary static paths', () => {
  for (const source of privatePaths) {
    let status, next = false;
    blockPublicProofFiles({ path: source }, { sendStatus: code => { status = code; } }, () => { next = true; });
    assert.equal(status, 404, source); assert.equal(next, false, source);
  }
  for (const source of ['/uploads/menu/public.png', '/uploads/other.png', '/api/deliveries/1/proof', '/manifest.json']) {
    let next = false;
    blockPublicProofFiles({ path: source }, { sendStatus: code => assert.fail(`Unexpected ${code} for ${source}`) }, () => { next = true; });
    assert.equal(next, true, source);
  }
});

let root, server, port;
before(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'japz-private-proof-static-test-'));
  await mkdir(path.join(root, 'uploads', 'pod'), { recursive: true });
  await mkdir(path.join(root, 'uploads', 'menu'), { recursive: true });
  await writeFile(path.join(root, 'uploads', 'pod', 'legacy.png'), 'private-fixture');
  await writeFile(path.join(root, 'uploads', 'menu', 'public.png'), 'public-fixture');
  const app = express(); app.use(blockPublicProofFiles); app.use(express.static(root));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  port = server.address().port;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (root) {
    assert.match(path.basename(root), /^japz-private-proof-static-test-/);
    await rm(root, { recursive: true, force: true });
  }
});
function get(rawPath) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: rawPath }, response => {
      let body = '';
      response.setEncoding('utf8'); response.on('data', value => { body += value; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
      response.on('error', reject);
    }).on('error', reject);
  });
}
test('Express static never receives private or aliased POD requests', async () => {
  for (const source of privatePaths) {
    const response = await get(source);
    assert.equal(response.status, 404, source);
    assert.ok(!response.body.includes('private-fixture'), source);
  }
  const publicFile = await get('/uploads/menu/public.png');
  assert.equal(publicFile.status, 200); assert.equal(publicFile.body, 'public-fixture');
});
