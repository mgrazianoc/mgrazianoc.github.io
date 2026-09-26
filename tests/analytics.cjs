const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');

function environment(hostname) {
  const scripts = [];
  const context = vm.createContext({
    window: { location: { hostname } },
    document: {
      getElementById: id => scripts.find(script => script.id === id),
      createElement: () => ({}),
      head: { appendChild: script => scripts.push(script) }
    }
  });
  return { context, scripts, run: () => vm.runInContext(source, context) };
}

test('production initializes the supplied stream once and loads Google asynchronously', () => {
  const env = environment('mgrazianoc.github.io');
  env.run();
  env.run();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.scripts[0].async, true);
  assert.equal(env.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-PDC24SPYPE');
  const commands = Array.from(env.context.window.dataLayer, command => Array.from(command));
  assert.equal(commands.length, 2);
  assert.equal(commands[0][0], 'js');
  assert.deepEqual(commands[1], ['config', 'G-PDC24SPYPE']);
});

test('development, file previews, and other hosts never initialize or load analytics', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]', '', 'preview.example.com']) {
    const env = environment(hostname);
    env.run();
    assert.equal(env.scripts.length, 0, hostname);
    assert.equal(env.context.window.dataLayer, undefined, hostname);
    assert.equal(env.context.window.gtag, undefined, hostname);
  }
});

test('every page loads the shared analytics entry point once without blocking rendering', () => {
  for (const file of ['index.html', 'writing/index.html', 'writing/01/index.html', 'writing/02/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal((html.match(/<script src="\/analytics\.js\?v=1" defer><\/script>/g) || []).length, 1, file);
    assert.ok(html.indexOf('/analytics.js') < html.indexOf('</head>'), file);
    assert.ok(!html.includes('googletagmanager.com/gtag/js'), 'No duplicate inline Google tag: ' + file);
  }
});
