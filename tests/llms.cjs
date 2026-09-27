const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { parseHTML } = require('linkedom');
const { marked } = require('marked');
const { root, origin, buildArtifacts, checkArtifacts } = require('../scripts/build-llms.cjs');

const { pages, artifacts } = buildArtifacts();
const normalized = value => value.replace(/\s+/g, ' ').trim();
const render = markdown => parseHTML('<html><body>' + marked.parse(markdown) + '</body></html>').document;
function tokens(markdown, type) {
  const found = [];
  marked.walkTokens(marked.lexer(markdown), token => { if (token.type === type) found.push(token); });
  return found;
}

test('llms.txt has a compact directory structure with all canonical pages discoverable', () => {
  const index = artifacts.get('llms.txt');
  const blocks = marked.lexer(index).filter(token => token.type !== 'space');
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[0].depth, 1);
  assert.equal(blocks[0].text, 'Marco Graziano');
  assert.equal(blocks[1].type, 'blockquote');
  assert.equal(blocks.filter(token => token.type === 'heading' && token.depth === 1).length, 1);
  assert.ok(Buffer.byteLength(index) < 4096, 'Index stays small; full articles belong in linked files');
  const sections = blocks.filter(token => token.type === 'heading' && token.depth === 2);
  assert.equal(sections.at(-1).text, 'Optional');
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'heading' && blocks[i].depth === 2) {
      assert.equal(blocks[i + 1].type, 'list', 'Each section contains a list of described links');
      for (const item of blocks[i + 1].items) assert.match(item.text, /^\[[^\]]+\]\(https:\/\/[^)]+\): .+/);
    }
  }
  const links = tokens(index, 'link').map(token => token.href);
  for (const page of pages) assert.ok(links.includes(page.markdownUrl), page.file);
  assert.ok(links.includes(origin + '/llms-full.txt'));
  assert.equal(new Set(links).size, links.length);
});

test('HTML advertises the correct Markdown and site guide, with canonical provenance in each document', () => {
  for (const page of pages) {
    const alternate = page.document.querySelectorAll('head link[rel="alternate"][type="text/markdown"]');
    const guide = page.document.querySelectorAll('head link[rel="describedby"]');
    assert.equal(alternate.length, 1);
    assert.equal(new URL(alternate[0].getAttribute('href'), page.url).href, page.markdownUrl);
    assert.equal(guide.length, 1);
    assert.equal(guide[0].getAttribute('type'), 'text/plain');
    assert.equal(new URL(guide[0].getAttribute('href'), page.url).href, origin + '/llms.txt');
    const markdown = artifacts.get(page.markdownFile);
    const headings = tokens(markdown, 'heading').filter(token => token.depth === 1);
    assert.equal(headings.length, 1);
    assert.equal(headings[0].text, page.title);
    assert.ok(markdown.includes('Canonical page: [' + page.url + '](' + page.url + ')'));
    assert.ok(markdown.includes(page.description));
    assert.ok(markdown.includes('Author: [Marco Graziano]'));
  }
  assert.ok(fs.existsSync(path.join(root, '.nojekyll')), 'GitHub Pages must serve raw Markdown');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow:\s*\S/m);
});

test('all Markdown links are absolute, with existing local targets and valid HTML fragments', () => {
  for (const [file, markdown] of artifacts) {
    for (const token of [...tokens(markdown, 'link'), ...tokens(markdown, 'image')]) {
      const url = new URL(token.href); // Throws on relative or malformed URLs.
      assert.ok(['https:', 'mailto:'].includes(url.protocol), file + ': ' + token.href);
      if (url.origin !== origin) continue;
      const target = decodeURIComponent(url.pathname).slice(1) + (url.pathname.endsWith('/') ? 'index.html' : '');
      const local = path.resolve(root, target);
      assert.ok(local.startsWith(root + path.sep));
      assert.ok(artifacts.has(target) || fs.existsSync(local), file + ': missing ' + target);
      if (url.hash && target.endsWith('.html')) {
        const { document } = parseHTML(fs.readFileSync(local, 'utf8'));
        assert.ok(document.getElementById(decodeURIComponent(url.hash.slice(1))), file + ': missing fragment ' + token.href);
      }
    }
  }
});

for (const page of pages.filter(page => page.article)) {
  test(page.file + ': preserve every article paragraph, citation, tooltip, code sample, and text diagram', () => {
    const markdown = artifacts.get(page.markdownFile);
    const rendered = render(markdown);
    const prose = normalized(rendered.body.textContent);
    const article = page.document.querySelector('article.note');
    for (const paragraph of article.querySelectorAll('.note-body p:not(.bar), .dek, figcaption')) {
      const copy = paragraph.cloneNode(true);
      copy.querySelectorAll('.term-tip').forEach(node => node.remove());
      assert.ok(prose.includes(normalized(copy.textContent)), 'Lost prose: ' + normalized(copy.textContent).slice(0, 110));
    }
    const links = tokens(markdown, 'link').map(token => token.href);
    for (const link of article.querySelectorAll('.note-body a[href]')) {
      assert.ok(links.includes(new URL(link.getAttribute('href'), page.url).href), 'Missing citation');
    }
    for (const tooltip of article.querySelectorAll('.term-tip')) assert.ok(prose.includes(normalized(tooltip.textContent)), 'Missing definition');
    for (const filename of article.querySelectorAll('.art .bar span:first-child')) assert.ok(prose.includes(filename.textContent), 'Missing code filename');
    const sourceBlocks = [...article.querySelectorAll('pre')];
    const code = tokens(markdown, 'code');
    assert.equal(code.length, sourceBlocks.length);
    sourceBlocks.forEach((pre, i) => {
      assert.equal(code[i].text, pre.textContent.replace(/\n$/, ''), 'Code/diagram bytes changed');
      assert.equal(code[i].lang, pre.querySelector('code') ? 'rust' : 'text');
    });
  });
}

test('portfolio preserves service scope, experience, evidence, contact, and model caveats', () => {
  const home = pages.find(page => page.url === origin + '/');
  const markdown = artifacts.get(home.markdownFile);
  const prose = normalized(render(markdown).body.textContent);
  for (const node of home.document.querySelectorAll('.offer h3, .offer p, .offer li, .offer-foot > span, .systems h3, .systems p, .measure-foot, .measure-visual svg[aria-label]')) {
    const expected = node.getAttribute('aria-label') || normalized(node.textContent);
    assert.ok(prose.includes(expected), 'Missing portfolio context: ' + expected.slice(0, 100));
  }
  for (const value of ['São Paulo', 'UTC−3', 'mgrazianodecastro@gmail.com', 'Modeled instruments, not client captures.', 'Symptoms drawn from models, not from any client system.']) assert.ok(prose.includes(value));
  const links = tokens(markdown, 'link').map(token => token.href);
  for (const link of home.document.querySelectorAll('a[href*="github.com/apache/"]')) assert.ok(links.includes(link.href));
});

test('documents exclude interface noise, scripts, and unpublished drafts', () => {
  for (const [file, markdown] of artifacts) {
    assert.equal(tokens(markdown, 'html').length, 0, file + ': unexpected raw HTML');
    assert.doesNotMatch(markdown, /Scroll each figure|scroll horizontally|Toggle menu|Pause animations|gtag\(|G-PDC24SPYPE|<svg|<script/);
    assert.doesNotMatch(markdown, /https:\/\/mgrazianoc\.github\.io\/writing\/0[345]\//);
  }
});

test('complete text includes every page without changing code or creating extra top-level headings', () => {
  const full = artifacts.get('llms-full.txt');
  assert.equal(tokens(full, 'heading').filter(token => token.depth === 1).length, 1);
  for (const page of pages) assert.ok(full.includes('Canonical page: [' + page.url + ']'));
  assert.deepEqual(tokens(full, 'code').map(token => [token.lang, token.text]), pages.flatMap(page => tokens(artifacts.get(page.markdownFile), 'code').map(token => [token.lang, token.text])));
});

test('drift checks reject changed HTML and missing artifacts; regeneration safely preserves nested fences', () => {
  assert.equal(checkArtifacts().size, pages.length + 2);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-llms-'));
  try {
    for (const file of ['sitemap.xml', ...pages.map(page => page.file), ...artifacts.keys()]) {
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(directory, file));
    }
    const article = pages.find(page => page.article);
    const source = path.join(directory, article.file);
    const { document } = parseHTML(fs.readFileSync(source, 'utf8'));
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Newly published source content must reach both Markdown outputs.';
    const pre = document.createElement('pre');
    pre.textContent = '```\n# This is code, not a heading\n````\n';
    document.querySelector('article.note').append(paragraph, pre);
    fs.writeFileSync(source, document.toString());
    assert.throws(() => checkArtifacts(directory), /Missing or stale/);
    const regenerated = buildArtifacts(directory).artifacts;
    for (const file of [article.markdownFile, 'llms-full.txt']) {
      assert.ok(regenerated.get(file).includes(paragraph.textContent));
      assert.ok(tokens(regenerated.get(file), 'code').some(token => token.text === pre.textContent.trimEnd()), 'Nested fences changed the code');
    }
    for (const [file, value] of regenerated) fs.writeFileSync(path.join(directory, file), value);
    checkArtifacts(directory);
    fs.unlinkSync(path.join(directory, article.markdownFile));
    assert.throws(() => checkArtifacts(directory), /Missing or stale/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
