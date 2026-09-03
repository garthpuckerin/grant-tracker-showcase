import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { runReleaseSweeps } from '../scripts/run-release-sweeps.mjs';

const LOCAL_BASE_URL = 'http://127.0.0.1:3310';
const EXPECTED_SWEEPS = [
  fileURLToPath(new URL('../scripts/mobile-sweep.mjs', import.meta.url)),
  fileURLToPath(new URL('../scripts/viewport-sweep.mjs', import.meta.url)),
  fileURLToPath(new URL('../scripts/whiteglove-sweep.mjs', import.meta.url)),
];

function successfulChild() {
  const child = new EventEmitter();
  queueMicrotask(() => child.emit('exit', 0, null));
  return child;
}

function previewHarness({ closeError } = {}) {
  const calls = [];
  let closeCount = 0;
  return {
    calls,
    get closeCount() {
      return closeCount;
    },
    preview: async (options) => {
      calls.push(options);
      return {
        close: async () => {
          closeCount += 1;
          if (closeError) throw closeError;
        },
      };
    },
  };
}

test('runs mobile, viewport, and white-glove sweeps sequentially against the local candidate', async () => {
  const preview = previewHarness();
  const childCalls = [];
  let activeChildren = 0;

  await runReleaseSweeps({
    preview: preview.preview,
    spawn: (command, args, options) => {
      assert.equal(activeChildren, 0, 'sweeps must not overlap');
      activeChildren += 1;
      childCalls.push({ command, args, options });
      const child = new EventEmitter();
      queueMicrotask(() => {
        activeChildren -= 1;
        child.emit('exit', 0, null);
      });
      return child;
    },
  });

  assert.deepEqual(
    childCalls.map(({ args }) => args),
    EXPECTED_SWEEPS.map((script) => [script]),
  );
  assert.ok(childCalls.every(({ command }) => command === process.execPath));
  assert.ok(
    childCalls.every(
      ({ options }) => options.stdio === 'inherit' && options.shell === false,
    ),
    'sweeps must inherit output without invoking a shell',
  );
  assert.ok(
    childCalls.every(({ options }) => options.env.BASE_URL === LOCAL_BASE_URL),
    'every child must receive the exact local candidate URL',
  );
  assert.deepEqual(preview.calls, [
    {
      root: fileURLToPath(new URL('..', import.meta.url)),
      preview: { host: '127.0.0.1', port: 3310, strictPort: true },
    },
  ]);
});

test('propagates a child failure and does not run later sweeps', async () => {
  const preview = previewHarness();
  const launched = [];

  await assert.rejects(
    runReleaseSweeps({
      preview: preview.preview,
      spawn: (_command, [script]) => {
        launched.push(script);
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('exit', 23, null));
        return child;
      },
    }),
    (error) => error.exitCode === 23,
  );

  assert.deepEqual(launched, [EXPECTED_SWEEPS[0]]);
});

test('propagates the signal that terminates a child sweep', async () => {
  const preview = previewHarness();

  await assert.rejects(
    runReleaseSweeps({
      preview: preview.preview,
      spawn: () => {
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('exit', null, 'SIGTERM'));
        return child;
      },
    }),
    (error) => error.signal === 'SIGTERM',
  );
});

test('closes the preview server after all sweeps succeed', async () => {
  const preview = previewHarness();

  await runReleaseSweeps({ preview: preview.preview, spawn: successfulChild });

  assert.equal(preview.closeCount, 1);
});

test('closes the preview server after a child sweep fails', async () => {
  const preview = previewHarness();

  await assert.rejects(
    runReleaseSweeps({
      preview: preview.preview,
      spawn: () => {
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('exit', 1, null));
        return child;
      },
    }),
  );

  assert.equal(preview.closeCount, 1);
});

test('preserves a nonzero child exit when preview cleanup also fails', async () => {
  const cleanupError = new Error('preview close failed');
  const preview = previewHarness({ closeError: cleanupError });

  await assert.rejects(
    runReleaseSweeps({
      preview: preview.preview,
      spawn: () => {
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('exit', 19, null));
        return child;
      },
    }),
    (error) => error.exitCode === 19 && error.cleanupError === cleanupError,
  );

  assert.equal(preview.closeCount, 1);
});

test('preserves a child signal when preview cleanup also fails', async () => {
  const cleanupError = new Error('preview close failed');
  const preview = previewHarness({ closeError: cleanupError });

  await assert.rejects(
    runReleaseSweeps({
      preview: preview.preview,
      spawn: () => {
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('exit', null, 'SIGTERM'));
        return child;
      },
    }),
    (error) => error.signal === 'SIGTERM' && error.cleanupError === cleanupError,
  );

  assert.equal(preview.closeCount, 1);
});

test('surfaces a preview cleanup failure after successful sweeps', async () => {
  const cleanupError = new Error('preview close failed');
  const preview = previewHarness({ closeError: cleanupError });

  await assert.rejects(
    runReleaseSweeps({ preview: preview.preview, spawn: successfulChild }),
    (error) => error === cleanupError,
  );

  assert.equal(preview.closeCount, 1);
});

test('propagates a child process error unchanged and stops later sweeps', async () => {
  const preview = previewHarness();
  const spawnError = Object.assign(new Error('spawn failed'), { code: 'ENOENT' });
  const launched = [];

  await assert.rejects(
    runReleaseSweeps({
      preview: preview.preview,
      spawn: (_command, [script]) => {
        launched.push(script);
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('error', spawnError));
        return child;
      },
    }),
    (error) => error === spawnError && error.code === 'ENOENT',
  );

  assert.deepEqual(launched, [EXPECTED_SWEEPS[0]]);
  assert.equal(preview.closeCount, 1);
});
