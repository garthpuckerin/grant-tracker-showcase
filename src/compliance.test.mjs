// node --test src/compliance.test.mjs — compliance scores derive from findings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA, buildCompliance } from './data.js';

test('seed: 3 open findings → 86% portfolio, 2 CFR 200 has 1 fail, grant 1 has 2 failing rules', () => {
  const c = buildCompliance(DATA.compliance.findings);
  assert.equal(c.findings.filter((f) => f.status === 'OPEN').length, 3);
  assert.equal(c.portfolio.totalRules, 22);
  assert.equal(c.portfolio.totalPassing, 19);
  assert.equal(c.portfolio.score, 86);
  assert.equal(c.frameworks.find((f) => f.fw === '2 CFR 200').fail, 1);
  assert.deepEqual(c.grantRules['1'].filter((r) => !r.pass).map((r) => r.id), ['2 CFR 200.430', 'SAM.gov']);
});

test('resolving the 2 CFR 200.430 finding re-derives the framework, the score, and the grant rule together', () => {
  const findings = DATA.compliance.findings.map((f) => (f.id === 'f1' ? { ...f, status: 'RESOLVED' } : f));
  const c = buildCompliance(findings);
  assert.equal(c.frameworks.find((f) => f.fw === '2 CFR 200').fail, 0, 'framework fail count drops');
  assert.equal(c.portfolio.totalPassing, 20);
  assert.equal(c.portfolio.score, 91, 'portfolio score rises 86 → 91');
  const rule = c.grantRules['1'].find((r) => r.id === '2 CFR 200.430');
  assert.equal(rule.pass, true, 'the grant rule flips to passing');
  assert.equal(rule.note, 'All FY25 certifications on file.', 'the note swaps to the passing note');
  assert.equal(c.grantRules['1'].find((r) => r.id === 'SAM.gov').pass, false, 'unrelated open finding still fails');
});

test('buildCompliance never mutates its input', () => {
  const input = DATA.compliance.findings;
  const snapshot = JSON.stringify(input);
  buildCompliance(input);
  assert.equal(JSON.stringify(input), snapshot);
});
