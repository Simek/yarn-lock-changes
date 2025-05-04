import lockfile from '@yarnpkg/lockfile';
import { parseSyml } from '@yarnpkg/parsers';
import { test } from 'uvu';
import { is } from 'uvu/assert';

import { getTestLockContent } from '../testUtils.mjs';
import { parseLock } from '../../src/utils.mjs';

test('Classic - parser performance test (x100)', () => {
  const contentA = getTestLockContent('classic-downgrade', 'a.lock');
  const contentB = getTestLockContent('classic-downgrade', 'b.lock');

  console.log('\nClassic - parser performance test (x100)');
  console.time('@yarnpkg/lockfile\t');
  const start = performance.now();

  for (let i = 0; i < 100; i++) {
    lockfile.parse(contentA);
    lockfile.parse(contentB);
  }

  const end = performance.now();
  console.timeEnd('@yarnpkg/lockfile\t');

  console.time('Internal\t\t');
  const internalStart = performance.now();

  for (let i = 0; i < 100; i++) {
    parseLock(contentA);
    parseLock(contentB);
  }

  const internalEnd = performance.now();
  console.timeEnd('Internal\t\t');

  is(end - start > internalEnd - internalStart, true);
});

test('Berry - parser performance test (x100)', () => {
  const contentA = getTestLockContent('berry-v3', 'a.lock');
  const contentB = getTestLockContent('berry-v3', 'b.lock');

  console.log('\nBerry - parser performance test (x100)');
  console.time('@yarnpkg/parsers\t');
  const start = performance.now();

  for (let i = 0; i < 100; i++) {
    parseSyml(contentA);
    parseSyml(contentB);
  }

  const end = performance.now();
  console.timeEnd('@yarnpkg/parsers\t');

  console.time('Internal\t\t');
  const internalStart = performance.now();

  for (let i = 0; i < 100; i++) {
    parseLock(contentA);
    parseLock(contentB);
  }

  const internalEnd = performance.now();
  console.timeEnd('Internal\t\t');

  is(end - start > internalEnd - internalStart, true);
});

test.run();
