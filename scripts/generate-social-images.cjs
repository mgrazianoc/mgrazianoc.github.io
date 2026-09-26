// Render share cards from HTML/CSS and the site's existing assets.
// These committed PNGs are served directly; crawlers never need JavaScript.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
async function asset(file, type) {
  return `data:${type};base64,${(await fs.readFile(path.join(root, file))).toString('base64')}`;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    const portrait = await asset('assets/marco-graziano.jpg', 'image/jpeg');
    const cards = [
      { file: 'index.html', name: 'portfolio', label: 'Independent performance engineer', title: 'Marco Graziano', subtitle: 'Rust systems.\nThe hot path is the product.', detail: 'Tail latency · Allocators · Concurrency', portrait },
      { file: 'writing/index.html', name: 'writing', label: 'Writing / Marco Graziano', title: 'Notes from\nthe hot path.', subtitle: 'Performance, concurrency,\nand measurement.', detail: 'mgrazianoc.github.io/writing' },
      { file: 'writing/01/index.html', name: 'cliffhanger', label: 'Writing / 01 / Marco Graziano', art: await asset('writing/01/hanging-in-there.webp', 'image/webp') },
      { file: 'writing/02/index.html', name: 'someone-elses-problem', label: 'Writing / 02 / Marco Graziano', art: await asset('writing/02/if-it-fits.webp', 'image/webp') },
    ];
    await fs.mkdir(path.join(root, 'assets/social'), { recursive: true });
    for (const card of cards) {
      const html = await fs.readFile(path.join(root, card.file), 'utf8');
      const title = card.title || html.match(/<h1>([^<]+)<\/h1>/)[1];
      const lines = value => escape(value).replaceAll('\n', '<br>');
      await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin: 0; }
        body { width: 1200px; height: 630px; background: #0b0c0e; color: #eeece8; font-family: Helvetica, Arial, sans-serif; padding: 54px 64px; border-top: 6px solid #4ecf8a; }
        .label { color: #4ecf8a; font: 20px/1.4 Menlo, Consolas, monospace; letter-spacing: .025em; }
        h1 { font-size: 76px; font-weight: 600; line-height: 1.08; letter-spacing: -3px; }
        .content { height: 438px; display: flex; align-items: center; justify-content: space-between; gap: 38px; }
        .copy { flex: 1; }
        .subtitle { margin-top: 28px; font-size: 32px; line-height: 1.4; color: #b0aba4; }
        .detail { margin-top: 28px; font-size: 21px; color: #b0aba4; }
        .portrait { width: 286px; height: 400px; object-fit: contain; border-radius: 3px; }
        footer { font: 18px/1.5 Menlo, Consolas, monospace; color: #97928b; border-top: 1px solid #2a3038; padding-top: 18px; }
        .article h1 { font-size: 56px; line-height: 1.12; letter-spacing: -1.8px; max-width: 1000px; margin-top: 22px; }
        .art { display: block; width: 1072px; height: 285px; object-fit: contain; margin: 14px 0 16px; }
      </style><body class="${card.art ? 'article' : ''}">
        <p class="label">${escape(card.label)}</p>
        ${card.art
          ? `<h1>${lines(title)}</h1><img class="art" src="${card.art}" alt="">`
          : `<div class="content"><div class="copy"><h1>${lines(title)}</h1><p class="subtitle">${lines(card.subtitle)}</p><p class="detail">${escape(card.detail)}</p></div>${card.portrait ? `<img class="portrait" src="${card.portrait}" alt="Marco Graziano">` : ''}</div>`}
        <footer>mgrazianoc.github.io</footer>
      </body></html>`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode()));
      });
      const clipped = await page.evaluate(() => [...document.querySelectorAll('h1, p, img, footer')].some(el => {
        const rect = el.getBoundingClientRect();
        return rect.bottom > 630 || rect.right > 1200 || el.scrollWidth > el.clientWidth;
      }));
      if (clipped) throw new Error(`Clipped social card: ${card.name}`);
      await page.screenshot({ path: path.join(root, `assets/social/${card.name}.png`) });
      console.log(`Rendered ${card.name}.png (1200 × 630)`);
    }
    const icon = await asset('assets/favicon.svg', 'image/svg+xml');
    for (const [size, file] of [[48, 'favicon.png'], [180, 'apple-touch-icon.png']]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<style>body{margin:0}img{display:block;width:100vw;height:100vh}</style><img src="${icon}" alt="MG">`);
      await page.locator('img').evaluate(image => image.decode());
      await page.screenshot({ path: path.join(root, 'assets', file) });
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
