// Preserve the official JAPZ GRILL artwork when generating mobile app icons.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
const logo = 'data:image/jpeg;base64,' + readFileSync(root + 'public/logo.jpg').toString('base64');
mkdirSync(root + 'public/icons',{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  for (const [name,size,scale] of [['japz-180',180,1],['japz-192',192,1],['japz-512',512,1],['japz-maskable-512',512,.66]]) {
    const page = await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await page.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;background:white;width:100vw;height:100vh;display:grid;place-items:center}img{width:${scale*100}vw;height:${scale*100}vh;object-fit:contain}</style><body><img src="${logo}" alt="JAPZ GRILL"></body></html>`);
    await page.locator('img').evaluate(image => image.decode());
    await page.screenshot({path:root + `public/icons/${name}.png`});
    await page.close();
  }
} finally { await browser.close(); }
console.log('Generated 180, 192, 512 and maskable icons from the official JAPZ GRILL logo.');