import type { Plugin, ResolvedConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export function pwaShell():Plugin {
  let config:ResolvedConfig;
  return {
    name:'japz-static-shell', apply:'build', enforce:'post',
    configResolved(value) { config = value; },
    writeBundle(_options, bundle) {
      const files = Object.keys(bundle).filter(name => /\.(js|css|woff2?)$/.test(name)).map(name => '/' + name);
      const staticFiles = ['/index.html','/offline.html','/manifest.json','/logo.jpg','/icons/japz-192.png','/icons/japz-512.png','/icons/japz-maskable-512.png','/icons/japz-180.png','/fonts/Inter-latin.woff'];
      const entry = Object.values(bundle).filter(item => item.type === 'chunk' && item.isEntry).map(item => '/' + item.fileName);
      const hash = createHash('sha256').update(JSON.stringify(files) + readFileSync(resolve(config.publicDir,'sw.js')));
      staticFiles.forEach(name => hash.update(readFileSync(resolve(config.root,config.build.outDir,name.slice(1)))));
      const version = hash.digest('hex').slice(0,12);
      const build = { version, precache:[...staticFiles,...entry,...files.filter(name => name.endsWith('.css'))], assets:[...staticFiles,...files] };
      const source = readFileSync(resolve(config.publicDir,'sw.js'),'utf8').replace(/^const CONFIG = .*; \/\/ BUILD_CONFIG$/m,`const CONFIG = ${JSON.stringify(build)};`);
      writeFileSync(resolve(config.root,config.build.outDir,'sw.js'),source);
    },
  };
}
