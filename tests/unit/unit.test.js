const lockfile = require('@yarnpkg/lockfile');
const fs = require('fs');
const path = require('path');

const { diffLocks, STATUS, countStatuses } = require('../../src/utils');

const getTestLockContent = (testName, filename) => {
  const content = fs.readFileSync(
    path.resolve(process.cwd(), './tests/unit/', testName, filename),
    {
      encoding: 'utf8'
    }
  );
  return content;
};

test('no downgrade detected', () => {
  const contentA = getTestLockContent('downgrade', 'a.lock');
  const contentB = getTestLockContent('downgrade', 'b.lock');

  const result = diffLocks(lockfile.parse(contentA), lockfile.parse(contentB));

  expect(Object.keys(result).length).toBe(54);

  expect(countStatuses(result, STATUS.ADDED)).toBe(3);
  expect(countStatuses(result, STATUS.UPDATED)).toBe(51);
  expect(countStatuses(result, STATUS.DOWNGRADED)).toBe(0);
  expect(countStatuses(result, STATUS.REMOVED)).toBe(0);
});
