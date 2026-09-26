const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const publicOrigin = 'https://mgrazianoc.github.io';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});

let browser;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  // Social scrapers must be able to read every tag without executing site scripts.
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  const robots = await (await context.request.get(origin + '/robots.txt')).text();
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: *\S/m);
  assert.ok(robots.includes(`Sitemap: ${publicOrigin}/sitemap.xml`));
  await page.goto(origin + '/sitemap.xml');
  const urls = await page.evaluate(() => {
    if (document.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
    return [...document.querySelectorAll('url > loc')].map(el => el.textContent);
  });
  assert.ok(urls.length > 0);
  assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap entries');

  // Discover content pages independently, so newly added pages cannot silently
  // be left out of the sitemap or this audit.
  async function discover(directory = root) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const found = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.') || ['node_modules', 'test-results', 'scripts', 'tests'].includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) found.push(...await discover(file));
      else if (entry.name === 'index.html') {
        const relative = path.relative(root, directory).split(path.sep).join('/');
        found.push(publicOrigin + '/' + (relative ? relative + '/' : ''));
      }
    }
    return found;
  }
  assert.deepEqual([...urls].sort(), (await discover()).sort(), 'Sitemap covers every content page');
  const titles = new Set(), descriptions = new Set(), assets = new Set(), links = new Set();
  const ids = new Map();
  for (const url of urls) {
    assert.equal(new URL(url).origin, publicOrigin);
    assert.ok(url.endsWith('/') && !url.includes('?') && !url.includes('#'), 'Clean canonical URL');
    const route = new URL(url).pathname;
    const response = await page.goto(origin + route);
    assert.equal(response.status(), 200);
    const data = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      metas: [...document.head.querySelectorAll('meta[name], meta[property]')].map(el => [el.name || el.getAttribute('property'), el.content]),
      canonicals: [...document.head.querySelectorAll('link[rel="canonical"]')].map(el => el.href),
      schemas: [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(el => JSON.parse(el.textContent)),
      h1: [...document.querySelectorAll('h1')].map(el => el.textContent),
      content: document.querySelector('main').textContent,
      ids: [...document.querySelectorAll('[id]')].map(el => el.id),
      links: [...document.querySelectorAll('a[href]')].map(el => el.href),
      assets: [...document.querySelectorAll('img[src], script[src], link[rel="stylesheet"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="preload"]')].map(el => el.src || el.href),
      responsiveImages: [...document.querySelectorAll('img[srcset]')].flatMap(el => el.srcset.split(',').map(candidate => new URL(candidate.trim().split(/\s+/)[0], document.baseURI).href)),
      images: [...document.images].map(el => ({ alt: el.getAttribute('alt'), width: el.getAttribute('width'), height: el.getAttribute('height') })),
      authors: [...document.querySelectorAll('a[rel="author"]')].map(el => ({ name: el.textContent, href: el.href })),
      width: document.documentElement.scrollWidth
    }));
    const meta = Object.fromEntries(data.metas);
    assert.equal(data.metas.length, new Set(data.metas.map(([name]) => name)).size, `${route}: conflicting metadata`);
    assert.equal(data.lang, 'en');
    assert.equal(data.h1.length, 1);
    assert.ok(data.content.trim().length > 300, 'Substantive content available without JavaScript');
    assert.ok(data.width <= 390, 'Mobile reflow with JavaScript disabled');
    assert.ok(data.title && !/· v\d+/.test(data.title));
    assert.ok(!titles.has(data.title), 'Unique page title');
    assert.ok(meta.description.length >= 80 && meta.description.length <= 180);
    assert.ok(!descriptions.has(meta.description), 'Unique page description');
    titles.add(data.title); descriptions.add(meta.description);
    assert.deepEqual(data.canonicals, [url]);
    assert.equal(meta['og:url'], url);
    assert.equal(meta['og:description'], meta.description);
    assert.equal(meta['twitter:description'], meta.description);
    assert.equal(meta['twitter:title'], meta['og:title']);
    assert.equal(meta['og:site_name'], 'Marco Graziano');
    assert.equal(meta['twitter:card'], 'summary_large_image');
    assert.equal(meta['twitter:image'], meta['og:image']);
    assert.equal(meta['twitter:image:alt'], meta['og:image:alt']);
    assert.ok(meta['og:image:alt']);
    assert.equal(new URL(meta['og:image']).origin, publicOrigin);
    assert.equal(meta['og:image:type'], 'image/png');
    assert.equal(meta['og:image:width'], '1200');
    assert.equal(meta['og:image:height'], '630');
    assert.match(meta.robots, /max-image-preview:large/);
    assert.doesNotMatch(meta.robots, /noindex|nofollow|nosnippet|none/i);
    const imageResponse = await context.request.get(origin + new URL(meta['og:image']).pathname);
    assert.equal(imageResponse.status(), 200);
    const png = await imageResponse.body();
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    assert.ok(png.length < 5 * 1024 * 1024, 'Social image under 5 MB');
    for (const image of data.images) {
      assert.notEqual(image.alt, null, 'Images need descriptive or explicitly decorative alt text');
      assert.ok(Number(image.width) > 0 && Number(image.height) > 0, 'Image dimensions reserve layout space');
    }
    assert.equal(data.schemas.length, 1);
    assert.equal(data.schemas[0]['@context'], 'https://schema.org');
    const graph = data.schemas[0]['@graph'];
    const entity = type => graph.find(item => item['@type'] === type);
    const person = entity('Person');
    assert.equal(person.name, 'Marco Graziano');
    assert.equal(person.url, publicOrigin + '/');
    assert.equal(person['@id'], publicOrigin + '/#person');
    person.sameAs.forEach(profile => assert.ok(data.links.includes(profile), 'Profile links match visible content'));
    assets.add(person.image);
    const article = entity('BlogPosting');
    if (article) {
      assert.equal(meta['og:type'], 'article');
      assert.equal(article.headline, data.h1[0]);
      assert.equal(article.headline, meta['og:title']);
      assert.equal(article.url, url);
      assert.equal(article.description, meta.description);
      assert.equal(article.author['@id'], person['@id']);
      assert.equal(article.mainEntityOfPage['@id'], entity('WebPage')['@id']);
      assert.equal(entity('WebPage').mainEntity['@id'], article['@id']);
      assert.ok(data.authors.some(author => author.name === person.name && author.href === origin + '/'));
      assert.ok(data.assets.includes(article.image.url.replace(publicOrigin, origin)), 'Article schema uses a visible editorial image');
    } else {
      assert.equal(meta['og:type'], 'website');
      if (route === '/') {
        assert.equal(entity('WebSite').url, url);
        assert.equal(entity('WebSite').name, meta['og:site_name']);
        assert.equal(entity('ProfilePage').mainEntity['@id'], person['@id']);
      } else {
        for (const item of entity('CollectionPage').mainEntity.itemListElement) {
          assert.ok(data.links.includes(item.url.replace(publicOrigin, origin)));
        }
      }
    }
    const breadcrumb = entity('BreadcrumbList');
    if (route !== '/') {
      assert.ok(breadcrumb.itemListElement.length >= 2);
      breadcrumb.itemListElement.forEach((item, index) => {
        assert.equal(item.position, index + 1);
        assert.ok(urls.includes(item.item));
      });
      assert.equal(breadcrumb.itemListElement.at(-1).item, url);
    }
    ids.set(route, new Set(data.ids));
    data.assets.forEach(asset => assets.add(asset));
    data.responsiveImages.forEach(asset => assets.add(asset));
    data.links.forEach(link => links.add(link));
    console.log(`PASS ${route}: static metadata, social image, schema, authorship, mobile content`);
  }
  const css = await fs.readFile(path.join(root, 'styles.css'), 'utf8');
  for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
    const value = match[1].replace(/^['"]|['"]$/g, '');
    if (!value.startsWith('data:')) assets.add(new URL(value, publicOrigin + '/styles.css').href);
  }
  for (const asset of assets) {
    const url = new URL(asset);
    if (![origin, publicOrigin].includes(url.origin)) continue;
    const response = await context.request.get(origin + url.pathname);
    assert.equal(response.status(), 200, 'Missing asset: ' + asset);
  }
  for (const link of links) {
    const url = new URL(link);
    if (![origin, publicOrigin].includes(url.origin)) continue;
    assert.ok(ids.has(url.pathname), 'Internal link absent from sitemap: ' + link);
    if (url.hash) assert.ok(ids.get(url.pathname).has(decodeURIComponent(url.hash.slice(1))), 'Broken anchor: ' + link);
  }
  assert.equal((await context.request.get(origin + '/missing-page-for-seo-test/')).status(), 404);
  console.log(`PASS sitemap, robots.txt, ${assets.size} asset references, internal links and anchors, real 404`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  server.close();
});
