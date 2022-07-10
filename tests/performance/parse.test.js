const lockfile = require('@yarnpkg/lockfile');

const { getTestLockContent } = require('../testUtils');
const { parseLock } = require('../../src/utils');

test('naive performance test', () => {
  const contentA = getTestLockContent('classic-downgrade', 'a.lock');
  const contentB = getTestLockContent('classic-downgrade', 'b.lock');

  console.time('@yarnpkg/lockfile');
  const start = performance.now();

  lockfile.parse(contentA);
  lockfile.parse(contentB);

  const end = performance.now();
  console.timeEnd('@yarnpkg/lockfile');

  console.time('Internal parser');
  const internalStart = performance.now();

  parseLock(contentA);
  parseLock(contentB);

  const internalEnd = performance.now();
  console.timeEnd('Internal parser');

  expect(end - start).toBeGreaterThan(internalEnd - internalStart);
});
