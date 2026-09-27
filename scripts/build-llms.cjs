const fs = require('node:fs');
const path = require('node:path');
const { parseHTML, DOMParser } = require('linkedom');
const TurndownService = require('turndown');

const root = path.resolve(__dirname, '..');
const origin = 'https://mgrazianoc.github.io';
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const label = value => value.replace(/[\\[\]]/g, '\\$&');

function readPages(directory = root) {
  const sitemap = new DOMParser().parseFromString(fs.readFileSync(path.join(directory, 'sitemap.xml'), 'utf8'), 'text/xml');
  return [...sitemap.querySelectorAll('loc')].map(loc => {
    const url = new URL(text(loc));
    if (url.origin !== origin || !url.pathname.endsWith('/')) throw new Error('Unexpected sitemap URL: ' + url.href);
    const file = url.pathname.slice(1) + 'index.html';
    const { document } = parseHTML(fs.readFileSync(path.join(directory, file), 'utf8'));
    if (document.querySelector('link[rel="canonical"]')?.getAttribute('href') !== url.href) throw new Error('Canonical mismatch: ' + file);
    const heading = document.querySelector('main h1').cloneNode(true);
    heading.querySelectorAll('.sec-count').forEach(node => node.remove());
    return {
      file, url: url.href, document, title: text(heading),
      description: document.querySelector('meta[name="description"]').getAttribute('content'),
      author: document.querySelector('meta[name="author"]').getAttribute('content'),
      markdownFile: file.replace(/\.html$/, '.md'),
      markdownUrl: new URL('index.md', url).href,
      article: Boolean(document.querySelector('article.note'))
    };
  });
}

function markdownBody(page) {
  const document = page.document;
  const content = (document.querySelector('article.note') || document.querySelector('main')).cloneNode(true);
  const glossary = new Map();
  for (const term of content.querySelectorAll('.term')) {
    const tip = term.querySelector('.term-tip');
    if (tip) {
      const definition = text(tip);
      tip.remove();
      glossary.set(text(term), definition);
    }
    term.replaceWith(document.createTextNode(text(term)));
  }
  // Preserve whitespace and syntax inside every code block and ASCII diagram.
  for (const pre of content.querySelectorAll('pre')) {
    const filename = pre.parentElement.querySelector('.bar span')?.textContent || '';
    pre.setAttribute('data-language', filename.endsWith('.rs') ? 'rust' : 'text');
  }
  // SVG paths are not readable prose; retain the diagram's accessible description.
  for (const svg of content.querySelectorAll('svg')) {
    const description = svg.getAttribute('aria-label');
    if (description) {
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Diagram: ' + description + '.';
      svg.replaceWith(paragraph);
    } else svg.remove();
  }
  content.querySelectorAll('nav, script, style, button, .note-back, .note-kicker, .sec-count, .no, .headins .comp, .chart-scroll-hint, .measure-no').forEach(node => node.remove());
  content.querySelectorAll('[hidden], [aria-hidden="true"], .sr-only').forEach(node => {
    if (!node.closest('pre') && node.tagName !== 'DT') node.remove();
  });
  content.querySelector('h1')?.remove();
  // Flatten visual article cards into ordinary links and descriptions.
  for (const card of content.querySelectorAll('a.note-preview')) {
    const title = text(card.querySelector('.title'));
    const description = text(card.querySelector('p'));
    card.textContent = title;
    card.after(document.createTextNode(': ' + description));
  }
  for (const image of content.querySelectorAll('img')) {
    if (!image.getAttribute('alt')) image.remove();
    else image.setAttribute('src', new URL(image.getAttribute('src'), page.url).href);
  }
  for (const anchor of content.querySelectorAll('a[href]')) {
    anchor.setAttribute('href', new URL(anchor.getAttribute('href'), page.url).href);
  }
  // These spans are visually separated by CSS; preserve that separation in text.
  for (const item of content.querySelectorAll('.offer-foot > span')) {
    item.after(document.createElement('br'));
  }
  for (const anchor of content.querySelectorAll('.close .side a')) anchor.after(document.createTextNode(' '));
  content.querySelectorAll('.art .bar span:last-child').forEach(node => node.remove());
  for (const list of content.querySelectorAll('.systems')) {
    const section = document.createElement('div');
    for (const item of list.children) {
      const entry = document.createElement('div');
      entry.innerHTML = item.innerHTML;
      section.append(entry);
    }
    list.replaceWith(section);
  }

  const converter = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', preformattedCode: true, br: '\\' });
  converter.addRule('codeAndDiagrams', {
    filter: 'pre',
    replacement: (_, node) => {
      const code = node.textContent.replace(/\n$/, '');
      const longest = Math.max(2, ...(code.match(/`+/g) || []).map(run => run.length));
      const fence = '`'.repeat(longest + 1);
      return '\n\n' + fence + node.getAttribute('data-language') + '\n' + code + '\n' + fence + '\n\n';
    }
  });
  converter.addRule('definitionTerm', { filter: 'dt', replacement: value => '\n\n**' + value + '**\n\n' });
  converter.addRule('definitionValue', { filter: 'dd', replacement: value => value + '\n\n' });
  converter.addRule('figureCaption', { filter: 'figcaption', replacement: value => '\n\n' + value + '\n\n' });
  converter.addRule('codeFilename', {
    filter: node => node.classList?.contains('bar') && node.parentElement.classList.contains('art'),
    replacement: (_, node) => '\n\n`' + text(node) + '`\n\n'
  });
  converter.addRule('multilineHeading', {
    filter: ['h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (value, node) => '\n\n' + '#'.repeat(Number(node.nodeName[1])) + ' ' + value.replace(/\s+/g, ' ').trim() + '\n\n'
  });
  let body = converter.turndown(content.innerHTML);
  if (glossary.size) {
    body += '\n\n## Terminology\n\n' + [...glossary].map(([term, definition]) => '- **' + label(term) + '**: ' + definition).join('\n');
  }
  const related = [...document.querySelectorAll('.note-pager a[href]')];
  if (related.length) {
    body += '\n\n## Related writing\n\n' + related.map(anchor => {
      const copy = anchor.cloneNode(true);
      copy.querySelector('.label')?.remove();
      return '- [' + label(text(copy)) + '](' + new URL(anchor.getAttribute('href'), page.url).href + ')';
    }).join('\n');
  }
  return mapProseLines(body, line => line.trimEnd());
}

// Transform prose only; code can contain Markdown-looking headings or fences.
function mapProseLines(markdown, transform) {
  let fenceLength = 0;
  return markdown.split('\n').map(line => {
    const fence = line.match(/^(`{3,})(.*)$/);
    if (fenceLength) {
      if (fence && fence[1].length >= fenceLength && !fence[2].trim()) fenceLength = 0;
      return line;
    }
    if (fence) { fenceLength = fence[1].length; return line; }
    return transform(line);
  }).join('\n');
}

function renderPage(page) {
  return '# ' + label(page.title) + '\n\n' +
    '> ' + page.description + '\n\n' +
    'Author: [' + label(page.author) + '](' + origin + '/).\n' +
    'Canonical page: [' + page.url + '](' + page.url + ').\n' +
    'Site guide: [llms.txt](' + origin + '/llms.txt).\n\n' + markdownBody(page) + '\n';
}

function renderIndex(pages) {
  const home = pages.find(page => page.url === origin + '/');
  const writing = pages.find(page => page.url === origin + '/writing/');
  if (!home || !writing) throw new Error('The portfolio and writing index must be present');
  const person = JSON.parse(home.document.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(entity => entity['@type'] === 'Person');
  const entry = (page, name = page.title) => '- [' + label(name) + '](' + page.markdownUrl + '): ' + page.description;
  return '# ' + label(home.title) + '\n\n' +
    '> ' + home.description + '\n\n' +
    'This is Marco Graziano\'s professional portfolio and technical writing. ' +
    'The documents below are Markdown versions generated from the published pages; each identifies its canonical HTML source. ' +
    'The portfolio\'s latency charts and measurement instruments are explanatory models, not client benchmark results.\n\n' +
    '## Portfolio\n\n' + entry(home, 'Profile, services, experience, and contact') + '\n\n' +
    '## Writing\n\n' + entry(writing, 'Writing index') + '\n' +
    pages.filter(page => page.article).map(page => entry(page)).join('\n') + '\n\n' +
    '## Optional\n\n' +
    '- [Complete text](' + origin + '/llms-full.txt): All published pages in one document; includes complete articles, code examples, and text diagrams.\n' +
    person.sameAs.map(url => '- [' + (new URL(url).hostname === 'github.com' ? 'GitHub profile' : 'LinkedIn profile') + '](' + url + '): Public professional profile linked from the portfolio.').join('\n') + '\n';
}

function buildArtifacts(directory = root) {
  const pages = readPages(directory);
  const artifacts = new Map(pages.map(page => [page.markdownFile, renderPage(page)]));
  artifacts.set('llms.txt', renderIndex(pages));
  artifacts.set('llms-full.txt', '# Marco Graziano — complete site text\n\n' +
    '> Generated from the published HTML pages. Each section identifies its canonical source.\n\n' +
    pages.map(page => mapProseLines(artifacts.get(page.markdownFile).trimEnd(), line => /^#{1,5} /.test(line) ? '#' + line : line)).join('\n\n---\n\n') + '\n');
  return { pages, artifacts };
}

function checkArtifacts(directory = root) {
  const { artifacts } = buildArtifacts(directory);
  const stale = [...artifacts].filter(([file, expected]) => {
    try { return fs.readFileSync(path.join(directory, file), 'utf8') !== expected; }
    catch { return true; }
  }).map(([file]) => file);
  if (stale.length) throw new Error('Missing or stale LLM documents: ' + stale.join(', ') + '. Run npm run build:llms.');
  return artifacts;
}

if (require.main === module) {
  try {
    if (process.argv.includes('--check')) {
      console.log('Verified ' + checkArtifacts().size + ' generated LLM documents match the HTML sources.');
    } else {
      for (const [file, markdown] of buildArtifacts().artifacts) {
        fs.writeFileSync(path.join(root, file), markdown);
        console.log('Generated ' + file + ' (' + Buffer.byteLength(markdown) + ' bytes)');
      }
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { root, origin, readPages, renderPage, buildArtifacts, checkArtifacts };
