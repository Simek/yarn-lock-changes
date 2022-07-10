const { diffLocks, STATUS, countStatuses, parseLock } = require('../../src/utils');
const { getTestLockContent } = require('../testUtils');

describe('Yarn Classic', () => {
  test('detect changes', () => {
    const contentA = getTestLockContent('classic-downgrade', 'a.lock');
    const contentB = getTestLockContent('classic-downgrade', 'b.lock');

    const result = diffLocks(parseLock(contentA), parseLock(contentB));

    expect(Object.keys(result).length).toBe(52);

    expect(countStatuses(result, STATUS.ADDED)).toBe(3);
    expect(countStatuses(result, STATUS.UPDATED)).toBe(49);
    expect(countStatuses(result, STATUS.DOWNGRADED)).toBe(0);
    expect(countStatuses(result, STATUS.REMOVED)).toBe(0);
  });

  test('no downgrade detected, multiple cases', () => {
    const contentA = getTestLockContent('classic-downgrade-complex', 'a.lock');
    const contentB = getTestLockContent('classic-downgrade-complex', 'b.lock');

    const result = diffLocks(parseLock(contentA), parseLock(contentB));

    expect(Object.keys(result).length).toBe(389);

    expect(countStatuses(result, STATUS.ADDED)).toBe(357);
    expect(countStatuses(result, STATUS.UPDATED)).toBe(32);
    expect(countStatuses(result, STATUS.DOWNGRADED)).toBe(0);
    expect(countStatuses(result, STATUS.REMOVED)).toBe(0);
  });
});

describe('Yarn Berry', () => {
  test('v2 - detect changes', () => {
    const contentA = getTestLockContent('berry-v2', 'a.lock');
    const contentB = getTestLockContent('berry-v2', 'b.lock');

    const result = diffLocks(parseLock(contentA), parseLock(contentB));

    expect(Object.keys(result).length).toBe(6);

    expect(countStatuses(result, STATUS.ADDED)).toBe(1);
    expect(countStatuses(result, STATUS.UPDATED)).toBe(4);
    expect(countStatuses(result, STATUS.DOWNGRADED)).toBe(0);
    expect(countStatuses(result, STATUS.REMOVED)).toBe(1);
  });

  test('v3 - detect changes', () => {
    const contentA = getTestLockContent('berry-v3', 'a.lock');
    const contentB = getTestLockContent('berry-v3', 'b.lock');

    const result = diffLocks(parseLock(contentA), parseLock(contentB));

    expect(Object.keys(result).length).toBe(7);

    expect(countStatuses(result, STATUS.ADDED)).toBe(1);
    expect(countStatuses(result, STATUS.UPDATED)).toBe(5);
    expect(countStatuses(result, STATUS.DOWNGRADED)).toBe(0);
    expect(countStatuses(result, STATUS.REMOVED)).toBe(1);
  });
});
