const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {pathToFileURL} = require('node:url');
const repoRequire = createRequire(path.resolve(__dirname, '../../japz-web/package.json'));
const {chromium} = repoRequire('@playwright/test');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const item of JSON.parse(fs.readFileSync(path.join(__dirname,'_work/manifest.json'),'utf8'))) {
      const page = await browser.newPage({viewport:{width:item.width,height:item.height},deviceScaleFactor:2});
      await page.goto(pathToFileURL(path.join(__dirname,'svg',item.slug+'.svg')).href);
      await page.screenshot({path:path.join(__dirname,'png',item.slug+'.png'),fullPage:true});
      await page.close();
      console.log('Rendered '+item.slug);
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
