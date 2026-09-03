import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PRODUCT_NAME = 'Grant Tracker';
const PACKAGE_NAME = 'grant-tracker-showcase';
const PACKAGE_DESCRIPTION =
  'Grant Tracker — public cockpit demo. A federal grant-management command center: awards, budgets, RBAC-gated reallocation approvals, compliance (2 CFR 200), and SF-425 federal reporting. Mock data; the engine is private.';
const STANDARD_DESCRIPTION =
  'A federal grant-management command center: multi-year awards, budget-vs-actuals, RBAC-gated reallocation approvals, 2 CFR 200 compliance, and SF-425 federal reporting that cross-foots to the ledger. Portfolio demo on mock data, by Garth Puckerin.';
const OPEN_GRAPH_TITLE = 'Grant Tracker — from typewriter to database';
const OPEN_GRAPH_DESCRIPTION =
  'A federal grant-management cockpit: awards, budgets, RBAC-gated reallocation approvals, compliance, and cross-footing SF-425 reports. Portfolio demo on mock data.';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function withoutComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (comment) => ' '.repeat(comment.length));
}

function withoutInactiveContent(html) {
  return withoutComments(html).replace(
    /<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    (element) => ' '.repeat(element.length),
  );
}

function activeHead(html) {
  const document = withoutInactiveContent(html);
  const openings = [...document.matchAll(/<head\b[^>]*>/gi)];
  const closings = [...document.matchAll(/<\/head\s*>/gi)];

  assert.equal(openings.length, 1, 'document must contain exactly one active <head>');
  assert.equal(closings.length, 1, 'document must contain exactly one active </head>');

  const start = openings[0].index + openings[0][0].length;
  const end = closings[0].index;
  assert.ok(start <= end, 'active <head> must close after it opens');

  return { document, start, end };
}

function parseAttributes(startTag, tagName) {
  const attributeSource = startTag
    .replace(new RegExp(`^<${tagName}\\b`, 'i'), '')
    .replace(/\/?\s*>$/, '');
  const attributes = new Map();
  const attributePattern =
    /([^\s"'<>\/=]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of attributeSource.matchAll(attributePattern)) {
    const name = match[1].toLowerCase();
    assert.ok(!attributes.has(name), `duplicate ${name} attribute on <${tagName}>`);
    attributes.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attributes;
}

function findStartTags(document, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return [...document.matchAll(pattern)].map((match) => ({
    attributes: parseAttributes(match[0], tagName),
    end: match.index + match[0].length,
    start: match.index,
  }));
}

function requireUniqueHeadMeta(html, selector) {
  const head = activeHead(html);
  const matches = findStartTags(head.document, 'meta').filter(({ attributes }) =>
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
    matches[0].start >= head.start && matches[0].end <= head.end,
    `<meta ${selectorLabel}> must be inside the active <head>`,
  );

  return matches[0].attributes;
}

function requireUniqueHeadTitle(html) {
  const head = activeHead(html);
  const titles = [...head.document.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];

  assert.equal(titles.length, 1, 'document must contain exactly one active <title>');
  const start = titles[0].index;
  const end = start + titles[0][0].length;
  assert.ok(
    start >= head.start && end <= head.end,
    'active <title> must be inside the active <head>',
  );

  return titles[0][1].trim();
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
