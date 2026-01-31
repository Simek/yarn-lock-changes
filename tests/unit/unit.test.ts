import assert from 'node:assert/strict';
import test from 'node:test';

import { countStatuses, diffLocks, parseLock, STATUS } from '../../src/utils';
import { getTestLockContent } from '../testUtils';

void test('Yarn Classic - detect changes', () => {
  const contentA = getTestLockContent('classic-downgrade', 'a.lock');
  const contentB = getTestLockContent('classic-downgrade', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  assert(Object.keys(result).length === 52);

  assert(countStatuses(result, STATUS.ADDED) === 3);
  assert(countStatuses(result, STATUS.UPDATED) === 49);
  assert(countStatuses(result, STATUS.DOWNGRADED) === 0);
  assert(countStatuses(result, STATUS.REMOVED) === 0);
});

void test('Yarn Classic - no downgrade detected, multiple cases', () => {
  const contentA = getTestLockContent('classic-downgrade-complex', 'a.lock');
  const contentB = getTestLockContent('classic-downgrade-complex', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  assert(Object.keys(result).length === 389);

  assert(countStatuses(result, STATUS.ADDED) === 357);
  assert(countStatuses(result, STATUS.UPDATED) === 32);
  assert(countStatuses(result, STATUS.DOWNGRADED) === 0);
  assert(countStatuses(result, STATUS.REMOVED) === 0);
});

void test('Yarn Berry (v2) - detect changes', () => {
  const contentA = getTestLockContent('berry-v2', 'a.lock');
  const contentB = getTestLockContent('berry-v2', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  assert(Object.keys(result).length === 6);

  assert(countStatuses(result, STATUS.ADDED) === 1);
  assert(countStatuses(result, STATUS.UPDATED) === 4);
  assert(countStatuses(result, STATUS.DOWNGRADED) === 0);
  assert(countStatuses(result, STATUS.REMOVED) === 1);
});

void test('Yarn Berry (v3) - detect changes', () => {
  const contentA = getTestLockContent('berry-v3', 'a.lock');
  const contentB = getTestLockContent('berry-v3', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  assert(Object.keys(result).length === 7);

  assert(countStatuses(result, STATUS.ADDED) === 1);
  assert(countStatuses(result, STATUS.UPDATED) === 5);
  assert(countStatuses(result, STATUS.DOWNGRADED) === 0);
  assert(countStatuses(result, STATUS.REMOVED) === 1);
});

void test('Yarn Berry (v4) - detect changes', () => {
  const contentA = getTestLockContent('berry-v4', 'a.lock');
  const contentB = getTestLockContent('berry-v4', 'b.lock');

  const result = diffLocks(parseLock(contentA), parseLock(contentB));

  assert(Object.keys(result).length === 51);

  assert(countStatuses(result, STATUS.ADDED) === 1);
  assert(countStatuses(result, STATUS.UPDATED) === 32);
  assert(countStatuses(result, STATUS.DOWNGRADED) === 0);
  assert(countStatuses(result, STATUS.REMOVED) === 18);
});
