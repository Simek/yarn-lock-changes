import { test } from 'uvu';
import { is } from 'uvu/assert';

import { diffLocks, STATUS, countStatuses, parseLock } from '../../src/utils.mjs';
import { getTestLockContent } from '../testUtils.mjs';

test('Yarn Classic - detect changes', () => {
  const contentA = getTestLockContent('classic-downgrade', 'a.lock');
  const contentB = getTestLockContent('classic-downgrade', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  is(Object.keys(result).length, 52);

  is(countStatuses(result, STATUS.ADDED), 3);
  is(countStatuses(result, STATUS.UPDATED), 49);
  is(countStatuses(result, STATUS.DOWNGRADED), 0);
  is(countStatuses(result, STATUS.REMOVED), 0);
});

test('Yarn Classic - no downgrade detected, multiple cases', () => {
  const contentA = getTestLockContent('classic-downgrade-complex', 'a.lock');
  const contentB = getTestLockContent('classic-downgrade-complex', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  is(Object.keys(result).length, 389);

  is(countStatuses(result, STATUS.ADDED), 357);
  is(countStatuses(result, STATUS.UPDATED), 32);
  is(countStatuses(result, STATUS.DOWNGRADED), 0);
  is(countStatuses(result, STATUS.REMOVED), 0);
});

test('Yarn Berry (v2) - detect changes', () => {
  const contentA = getTestLockContent('berry-v2', 'a.lock');
  const contentB = getTestLockContent('berry-v2', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  is(Object.keys(result).length, 6);

  is(countStatuses(result, STATUS.ADDED), 1);
  is(countStatuses(result, STATUS.UPDATED), 4);
  is(countStatuses(result, STATUS.DOWNGRADED), 0);
  is(countStatuses(result, STATUS.REMOVED), 1);
});

test('Yarn Berry (v3) - detect changes', () => {
  const contentA = getTestLockContent('berry-v3', 'a.lock');
  const contentB = getTestLockContent('berry-v3', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  is(Object.keys(result).length, 7);

  is(countStatuses(result, STATUS.ADDED), 1);
  is(countStatuses(result, STATUS.UPDATED), 5);
  is(countStatuses(result, STATUS.DOWNGRADED), 0);
  is(countStatuses(result, STATUS.REMOVED), 1);
});

test.run();
