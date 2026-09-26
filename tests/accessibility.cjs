const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const playwright = require('playwright');
const axe = require('axe-core');

const root = path.resolve(__dirname, '..');
const routes = ['/', '/writing/', '/writing/01/', '/writing/02/'];
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
let browser;
let checks = 0;
async function check(name, fn) {
  await fn();
  checks++;
  console.log('PASS ' + name);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(sizes.document <= sizes.viewport + 1, JSON.stringify(sizes));
}
async function scan(page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(() => axe.run());
  assert.deepEqual(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
}
async function hidden(locator) { assert.equal(await locator.isVisible(), false); }
async function shown(locator) { assert.equal(await locator.isVisible(), true); }

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const engine = process.env.BROWSER || 'chromium';
  // macOS WebKit uses Option-Tab to include links in keyboard navigation.
  const tabKey = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
  browser = await playwright[engine].launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {});
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  // Keep the test independent of third-party font availability.
  await context.route('https://fonts.**/*', route => route.abort());
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await check(`${engine}: ${route} at ${width}px — reflow and axe`, async () => {
        await page.goto(origin + route);
        await noOverflow(page);
        await scan(page);
      });
    }
  }
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await check(`${route} at ${width}px — 200% text and WCAG text spacing`, async () => {
        await page.goto(origin + route);
        await page.addStyleTag({ content: 'html { font-size: 200%; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
        await noOverflow(page);
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await check('Mobile menu: keyboard, Escape, section focus, target size', async () => {
    await page.goto(origin);
    await page.keyboard.press(tabKey);
    assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('main').evaluate(el => el === document.activeElement), true);
    const toggle = page.locator('.nav-toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await shown(page.locator('.nav-cta'));
    await scan(page);
    for (const link of await page.locator('.nav a, .nav-toggle').all()) {
      const rect = await link.boundingBox();
      assert.ok(rect.height >= 44 && rect.width >= 44, '44px navigation targets');
    }
    await page.keyboard.press(tabKey);
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
    await toggle.click();
    await page.locator('.nav a[href="#measure"]').click();
    assert.equal(await page.locator('#measure').evaluate(el => el === document.activeElement), true);
    await hidden(page.locator('.nav-links'));
    await page.waitForFunction(() => Math.abs(document.querySelector('#measure').getBoundingClientRect().top - 70) < 100);
    const top = await page.locator('#measure').evaluate(el => el.getBoundingClientRect().top);
    assert.ok(top >= 56, 'Anchor heading clears the sticky navigation');
  });
  await check('Latency chart keeps readable, undistorted labels through mobile resize', async () => {
    await page.goto(origin);
    for (const viewport of [
      { width: 320, height: 740 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1440, height: 900 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(() => {
        const matrix = document.querySelector('#pct').getScreenCTM();
        return Math.abs(matrix.a - 1) < 0.01 && Math.abs(matrix.d - 1) < 0.01;
      });
      const drawing = await page.locator('#pct').evaluate(svg => {
        const box = svg.getBoundingClientRect();
        return {
          height: box.height,
          labels: [...svg.querySelectorAll('text')].map(label => {
            const bounds = label.getBoundingClientRect();
            return { height: bounds.height, inside: bounds.left >= box.left && bounds.right <= box.right + 1 && bounds.top >= box.top && bounds.bottom <= box.bottom + 1 };
          })
        };
      });
      assert.equal(drawing.labels.length, 5, 'All percentile and offered-load labels remain present');
      assert.ok(drawing.labels.every(label => label.height >= 10 && label.inside), JSON.stringify(drawing));
      assert.ok(drawing.height >= 250 && drawing.height <= 320, 'Plot height stays stable as controls wrap and orientation changes');
      await noOverflow(page);
    }
  });
  await check('Keyboard focus remains visible throughout the home page', async () => {
    await page.goto(origin);
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press(tabKey);
      const focus = await page.evaluate(() => {
        const el = document.activeElement, rect = el.getBoundingClientRect();
        const nav = document.querySelector('.nav');
        return { tag: el.tagName, top: rect.top, bottom: rect.bottom, inNav: nav.contains(el), skip: el.classList.contains('skip-link'), navBottom: nav.getBoundingClientRect().bottom, height: innerHeight };
      });
      if (focus.tag === 'BODY') break;
      assert.ok(focus.bottom > 0 && focus.top < focus.height, JSON.stringify(focus));
      if (!focus.inNav && !focus.skip) assert.ok(focus.top >= focus.navBottom - 1, JSON.stringify(focus));
    }
  });
  await check('Tooltip: focus, hoverable content, Escape, keyboard activation', async () => {
    await page.goto(origin + '/writing/01/');
    const term = page.locator('.term').first(), tip = page.locator('#tip-pen');
    await term.focus();
    await shown(tip);
    const box = await tip.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844);
    await page.keyboard.press('Escape');
    await hidden(tip);
    assert.equal(await term.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Space');
    await shown(tip);
    await page.keyboard.press(tabKey);
    await hidden(tip);
    await term.hover();
    await tip.hover();
    await page.waitForTimeout(250);
    await shown(tip);
    await page.keyboard.press('Escape');
    await hidden(tip);
  });
  await check('Touch tooltip opens on the first tap, closes on second/outside tap', async () => {
    const touch = await browser.newContext({ viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    await touch.route("https://**/*", route => route.abort());
    const p = await touch.newPage();
    await p.goto(origin + '/writing/01/');
    const term = p.locator('.term').first(), tip = p.locator('#tip-pen');
    await term.tap(); await shown(tip);
    await term.tap(); await hidden(tip);
    await term.tap(); await shown(tip);
    await p.locator('h1').tap(); await hidden(tip);
    await touch.close();
  });
  await check('Charts, code, and memory diagrams scroll with the keyboard', async () => {
    await page.goto(origin);
    await page.locator('.measure-visual').first().focus();
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.locator('.measure-visual').first().evaluate(el => el.scrollLeft > 0));
    await page.goto(origin + '/writing/02/');
    for (const selector of ['.art pre', '.note-fig']) {
      const pre = page.locator(selector).first();
      await pre.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(sel => document.querySelector(sel).scrollLeft > 0, selector);
    }
  });
  await check('Motion pause, persistence, and live reduced-motion changes', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(origin);
    const button = page.locator('.motion-toggle');
    await button.scrollIntoViewIfNeeded();
    const points = () => page.locator('#plines').innerHTML();
    const before = await points();
    await page.waitForTimeout(240);
    assert.notEqual(await points(), before);
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    const paused = await points();
    await page.waitForTimeout(240);
    assert.equal(await points(), paused);
    await page.reload();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    await button.click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.motion-toggle').disabled);
    const reduced = await points();
    await page.waitForTimeout(240);
    assert.equal(await points(), reduced);
    assert.equal(await button.isDisabled(), true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('.motion-toggle').disabled);
    assert.equal(await button.isDisabled(), false);
  });
  await check('No JavaScript: all navigation destinations and content remain available', async () => {
    const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 740 } });
    await nojs.route("https://**/*", route => route.abort());
    const p = await nojs.newPage();
    for (const route of routes) {
      await p.goto(origin + route);
      await shown(p.locator('.nav-me'));
      await shown(p.locator('.nav-cta'));
      for (const link of await p.locator('.nav-links a').all()) await shown(link);
      await noOverflow(p);
    }
    await nojs.close();
  });
  await check('Landscape and forced colors', async () => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto(origin);
    assert.equal(await page.locator('.nav').evaluate(el => getComputedStyle(el).position), 'static');
    await noOverflow(page);
    await scan(page);
  });
  assert.deepEqual(errors, [], 'No runtime exceptions');
  console.log(`\n${checks} checks passed (${engine}).`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  server.close();
});
