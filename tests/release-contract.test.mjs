import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse } from 'parse5';

const PRODUCT_NAME = 'Grant Tracker';
const PACKAGE_NAME = 'grant-tracker-showcase';
const PACKAGE_DESCRIPTION =
  'Grant Tracker — public cockpit demo. A federal grant-management command center: awards, budgets, RBAC-gated reallocation approvals, compliance (2 CFR 200), and SF-425 federal reporting. Mock data; the engine is private.';
const STANDARD_DESCRIPTION =
  'A federal grant-management command center: multi-year awards, budget-vs-actuals, RBAC-gated reallocation approvals, 2 CFR 200 compliance, and SF-425 federal reporting that cross-foots to the ledger. Portfolio demo on mock data, by Garth Puckerin.';
const OPEN_GRAPH_TITLE = 'Grant Tracker — from typewriter to database';
const OPEN_GRAPH_DESCRIPTION =
  'A federal grant-management cockpit: awards, budgets, RBAC-gated reallocation approvals, compliance, and cross-footing SF-425 reports. Portfolio demo on mock data.';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function elementAttributes(element) {
  const attributes = new Map();
  for (const attribute of element.attrs) {
    assert.ok(
      !attributes.has(attribute.name),
      `duplicate ${attribute.name} attribute on <${element.tagName}>`,
    );
    attributes.set(attribute.name, attribute.value);
  }
  return attributes;
}

function findElements(root, tagName) {
  const matches = [];
  for (const child of root.childNodes ?? []) {
    if (child.nodeName === tagName) matches.push(child);
    matches.push(...findElements(child, tagName));
  }
  return matches;
}

function textContent(element) {
  return (element.childNodes ?? [])
    .map((child) => (child.nodeName === '#text' ? child.value : textContent(child)))
    .join('');
}

function parsedDocument(html) {
  const document = parse(html, { scriptingEnabled: true });
  const htmlElements = findElements(document, 'html');
  assert.equal(
    htmlElements.length,
    1,
    'parsed document must contain exactly one <html> element',
  );
  const heads = findElements(htmlElements[0], 'head');
  assert.equal(
    heads.length,
    1,
    'parsed document must contain exactly one active <head>',
  );
  return { document, head: heads[0] };
}

function belongsTo(node, ancestor) {
  for (let parent = node.parentNode; parent; parent = parent.parentNode) {
    if (parent === ancestor) return true;
  }
  return false;
}

function requireUniqueHeadMeta(html, selector) {
  const { document, head } = parsedDocument(html);
  const matches = findElements(document, 'meta')
    .map((element) => ({ attributes: elementAttributes(element), element }))
    .filter(({ attributes }) =>
      Object.entries(selector).every(
        ([name, value]) => attributes.get(name.toLowerCase()) === value,
      ),
    );

  const selectorLabel = Object.entries(selector)
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');
  assert.equal(
    matches.length,
    1,
    `expected exactly one active <meta ${selectorLabel}>`,
  );
  assert.ok(
    belongsTo(matches[0].element, head),
    `<meta ${selectorLabel}> must be inside the active <head>`,
  );
  return matches[0].attributes;
}

function requireUniqueHeadTitle(html) {
  const { document, head } = parsedDocument(html);
  const titles = findElements(document, 'title').filter(
    (element) => element.namespaceURI === HTML_NAMESPACE,
  );

  assert.equal(titles.length, 1, 'document must contain exactly one active <title>');
  assert.ok(
    belongsTo(titles[0], head),
    'active <title> must be inside the active <head>',
  );
  return textContent(titles[0]).trim();
}

test('package metadata preserves the Grant Tracker identity', () => {
  assert.equal(packageJson.name, PACKAGE_NAME);
  assert.equal(packageJson.description, PACKAGE_DESCRIPTION);
  assert.match(packageJson.description, new RegExp(`^${PRODUCT_NAME}\\b`));
});

test('package scripts expose each existing release sweep', () => {
  assert.deepEqual(
    {
      'test:sweep:mobile': packageJson.scripts['test:sweep:mobile'],
      'test:sweep:viewport': packageJson.scripts['test:sweep:viewport'],
      'test:sweep:whiteglove': packageJson.scripts['test:sweep:whiteglove'],
    },
    {
      'test:sweep:mobile': 'node scripts/mobile-sweep.mjs',
      'test:sweep:viewport': 'node scripts/viewport-sweep.mjs',
      'test:sweep:whiteglove': 'node scripts/whiteglove-sweep.mjs',
    },
  );
});

test('active head preserves the canonical title and descriptions', () => {
  assert.equal(requireUniqueHeadTitle(indexHtml), PRODUCT_NAME);
  assert.equal(
    requireUniqueHeadMeta(indexHtml, { name: 'description' }).get('content'),
    STANDARD_DESCRIPTION,
  );
  assert.equal(
    requireUniqueHeadMeta(indexHtml, { property: 'og:title' }).get('content'),
    OPEN_GRAPH_TITLE,
  );
  assert.equal(
    requireUniqueHeadMeta(indexHtml, { property: 'og:description' }).get('content'),
    OPEN_GRAPH_DESCRIPTION,
  );
});

test('active head preserves intentional indexing and social-card metadata', () => {
  assert.equal(
    requireUniqueHeadMeta(indexHtml, { name: 'robots' }).get('content'),
    'noindex',
  );

  const openGraphImage = requireUniqueHeadMeta(indexHtml, {
    property: 'og:image',
  }).get('content');
  const parsedImage = new URL(openGraphImage);
  assert.equal(parsedImage.protocol, 'https:');
  assert.equal(parsedImage.href, openGraphImage);

  assert.equal(
    requireUniqueHeadMeta(indexHtml, { property: 'og:image:width' }).get('content'),
    '2400',
  );
  assert.equal(
    requireUniqueHeadMeta(indexHtml, { property: 'og:image:height' }).get('content'),
    '1260',
  );
  assert.equal(
    requireUniqueHeadMeta(indexHtml, { name: 'twitter:card' }).get('content'),
    'summary_large_image',
  );
});

test('metadata parsing ignores comments and requires exact selector attributes', () => {
  const html = `
    <html>
      <head>
        <!-- <meta name="description" content="commented duplicate"> -->
        <meta data-name="description" content="lookalike">
        <meta name="description" content="canonical">
      </head>
      <body></body>
    </html>`;
  const lookalikeOnly = `
    <html><head>
      <meta data-name="description" content="lookalike">
    </head><body></body></html>`;

  assert.equal(
    requireUniqueHeadMeta(html, { name: 'description' }).get('content'),
    'canonical',
  );
  assert.throws(
    () => requireUniqueHeadMeta(lookalikeOnly, { name: 'description' }),
    /exactly one active/,
  );
});

test('metadata parsing rejects duplicates and out-of-head metadata', () => {
  const duplicate = `
    <html><head>
      <meta property="og:title" content="first">
      <meta property="og:title" content="second">
    </head><body></body></html>`;
  const outsideHead = `
    <html><head><title>Grant Tracker</title></head><body>
      <meta property="og:title" content="outside">
    </body></html>`;

  assert.throws(
    () => requireUniqueHeadMeta(duplicate, { property: 'og:title' }),
    /exactly one active/,
  );
  assert.throws(
    () => requireUniqueHeadMeta(outsideHead, { property: 'og:title' }),
    /must be inside the active <head>/,
  );
});

test('metadata parsing does not accept tags embedded in inert head elements', () => {
  for (const tagName of ['script', 'style', 'template', 'noscript']) {
    const metaOnly = `
      <html><head>
        <${tagName}><meta property="og:title" content="embedded"></${tagName}>
      </head><body></body></html>`;
    const titleOnly = `
      <html><head>
        <${tagName}><title>embedded</title></${tagName}>
      </head><body></body></html>`;

    assert.throws(
      () => requireUniqueHeadMeta(metaOnly, { property: 'og:title' }),
      /exactly one active/,
      `<meta> text inside <${tagName}> must not satisfy the contract`,
    );
    assert.throws(
      () => requireUniqueHeadTitle(titleOnly),
      /exactly one active/,
      `<title> text inside <${tagName}> must not satisfy the contract`,
    );
  }
});

test('metadata parsing does not expose tags after a nested template closes', () => {
  const nestedMeta = `
    <html><head>
      <template>
        <template></template>
        <meta property="og:title" content="embedded after inner close">
      </template>
    </head><body></body></html>`;
  const nestedTitle = `
    <html><head>
      <template>
        <template></template>
        <title>embedded after inner close</title>
      </template>
    </head><body></body></html>`;

  assert.throws(
    () => requireUniqueHeadMeta(nestedMeta, { property: 'og:title' }),
    /exactly one active/,
  );
  assert.throws(
    () => requireUniqueHeadTitle(nestedTitle),
    /exactly one active/,
  );
});

test('metadata parsing follows browser head closure when body starts', () => {
  const metadataAfterBody = `
    <html><head><body>
      <meta property="og:title" content="after body">
      <title>after body</title>
    </head></body></html>`;

  assert.throws(
    () => requireUniqueHeadMeta(metadataAfterBody, { property: 'og:title' }),
    /must be inside the active <head>/,
  );
  assert.throws(
    () => requireUniqueHeadTitle(metadataAfterBody),
    /must be inside the active <head>/,
  );
});

test('metadata parsing does not accept a fake head inside textarea content', () => {
  const fakeHead = `
    <html><body><textarea>
      <head>
        <meta property="og:title" content="textarea content">
        <title>textarea content</title>
      </head>
    </textarea></body></html>`;

  assert.throws(
    () => requireUniqueHeadMeta(fakeHead, { property: 'og:title' }),
    /exactly one active/,
  );
  assert.throws(
    () => requireUniqueHeadTitle(fakeHead),
    /exactly one active/,
  );
});

test('metadata parsing rejects matching duplicates outside the active head', () => {
  const duplicateOutsideHead = `
    <html>
      <head>
        <meta property="og:title" content="Grant Tracker">
        <title>Grant Tracker</title>
      </head>
      <body>
        <meta property="og:title" content="Grant Tracker">
        <title>Grant Tracker</title>
      </body>
    </html>`;

  assert.throws(
    () => requireUniqueHeadMeta(duplicateOutsideHead, { property: 'og:title' }),
    /exactly one active/,
  );
  assert.throws(
    () => requireUniqueHeadTitle(duplicateOutsideHead),
    /exactly one active/,
  );
});

test('title uniqueness ignores SVG accessibility titles', () => {
  const htmlWithSvgTitle = `
    <html>
      <head><title>Grant Tracker</title></head>
      <body>
        <svg role="img" aria-labelledby="chart-title">
          <title id="chart-title">Awards by status</title>
        </svg>
      </body>
    </html>`;

  assert.equal(requireUniqueHeadTitle(htmlWithSvgTitle), 'Grant Tracker');
});
