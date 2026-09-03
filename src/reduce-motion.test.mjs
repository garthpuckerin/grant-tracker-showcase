import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyStoredReduceMotion } from './reduce-motion.js';

const originalLocalStorage = globalThis.localStorage;
const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.localStorage = originalLocalStorage;
  globalThis.document = originalDocument;
});

test('startup restores the persisted reduce-motion appearance', () => {
  let reduced = false;
  globalThis.localStorage = {
    getItem: (key) => key === 'gt2:reducemotion:v1' ? 'on' : null,
    setItem: () => {},
  };
  globalThis.document = {
    documentElement: {
      classList: {
        toggle: (name, on) => {
          assert.equal(name, 'reduce-motion');
          reduced = on;
        },
      },
    },
  };

  assert.equal(applyStoredReduceMotion(), true);
  assert.equal(reduced, true);
});
