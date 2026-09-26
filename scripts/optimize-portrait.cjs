// Preserve the original photograph; generate smaller WebP delivery variants.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const original = await fs.readFile(path.join(root, 'assets/marco-graziano.jpg'));
    for (const width of [480, 764]) {
      const encoded = await page.evaluate(async ({ source, width }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = Math.round(image.naturalHeight * width / image.naturalWidth);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', 0.85).split(',')[1];
      }, { source: `data:image/jpeg;base64,${original.toString('base64')}`, width });
      const bytes = Buffer.from(encoded, 'base64');
      await fs.writeFile(path.join(root, `assets/marco-graziano-${width}.webp`), bytes);
      console.log(`Portrait ${width}px: ${bytes.length} bytes (original ${original.length})`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
