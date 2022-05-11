const semverCompare = require('semver/functions/compare');
const semverCoerce = require('semver/functions/coerce');
const semverValid = require('semver/functions/valid');

export const STATUS = {
  ADDED: 'ADDED',
  DOWNGRADED: 'DOWNGRADED',
  REMOVED: 'REMOVED',
  UPDATED: 'UPDATED',
};

export const countStatuses = (lockChanges, statusToCount) =>
  Object.values(lockChanges).filter(({ status }) => status === statusToCount).length;

const formatForNameCompare = (key) => key.substr(0, key.lastIndexOf('@'));

const formatForVersionCompare = (key) => {
  const version = key.substr(key.lastIndexOf('@') + 1);
  return semverValid(semverCoerce(version)) || '0.0.0';
};

const formatLockEntry = (obj) =>
  Object.fromEntries(
    Object.keys(obj.object)
      .sort((a, b) => {
        const nameCompare = formatForNameCompare(a).localeCompare(formatForNameCompare(b));
        if (nameCompare === 0) {
          return semverCompare(formatForVersionCompare(a), formatForVersionCompare(b));
        }
        return nameCompare;
      })
      .map((key) => {
        const nameParts = key.split('@');
        const name = nameParts[0] === '' ? '@' + nameParts[1] : nameParts[0];
        return [name, { name, version: obj.object[key].version }];
      })
  );

export const diffLocks = (previous, current) => {
  const changes = {};
  const previousPackages = formatLockEntry(previous);
  const currentPackages = formatLockEntry(current);

  Object.keys(previousPackages).forEach((key) => {
    changes[key] = {
      previous: previousPackages[key].version,
      current: '-',
      status: STATUS.REMOVED,
    };
  });

  Object.keys(currentPackages).forEach((key) => {
    if (!changes[key]) {
      changes[key] = {
        previous: '-',
        current: currentPackages[key].version,
        status: STATUS.ADDED,
      };
    } else {
      if (changes[key].previous === currentPackages[key].version) {
        delete changes[key];
      } else {
        changes[key].current = currentPackages[key].version;
        if (semverCompare(changes[key].previous, changes[key].current) === 1) {
          changes[key].status = STATUS.DOWNGRADED;
        } else {
          changes[key].status = STATUS.UPDATED;
        }
      }
    }
  });

  return changes;
};
