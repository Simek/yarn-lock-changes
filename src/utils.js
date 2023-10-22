const { warning } = require('@actions/core');

const semverCompare = require('semver/functions/compare');
const semverCoerce = require('semver/functions/coerce');
const semverValid = require('semver/functions/valid');

export const STATUS = {
  ADDED: 'ADDED',
  UPDATED: 'UPDATED',
  DOWNGRADED: 'DOWNGRADED',
  REMOVED: 'REMOVED'
};

export const STATUS_ORDER = [STATUS.ADDED, STATUS.UPDATED, STATUS.DOWNGRADED, STATUS.REMOVED];

export const countStatuses = (lockChanges, statusToCount) =>
  Object.values(lockChanges).filter(({ status }) => status === statusToCount).length;

const formatForNameCompare = key => key.substr(0, key.lastIndexOf('@'));

const formatForVersionCompare = key => {
  const version = key.substr(key.lastIndexOf('@') + 1);
  return semverValid(semverCoerce(version)) || '0.0.0';
};

const formatLockEntry = obj =>
  Object.fromEntries(
    Object.keys(obj.object)
      .sort((a, b) => {
        const nameCompare = formatForNameCompare(a).localeCompare(formatForNameCompare(b));
        if (nameCompare === 0) {
          return semverCompare(formatForVersionCompare(a), formatForVersionCompare(b));
        }
        return nameCompare;
      })
      .map(key => {
        const nameParts = key.split('@');
        const name = nameParts[0] === '' ? '@' + nameParts[1] : nameParts[0];
        return [name, { name, version: obj.object[key].version }];
      })
  );

const detectYarnVersion = lines => {
  if (lines[1].includes('v1')) {
    return {
      version: 1,
      skipLines: 4
    };
  } else if (lines[4].includes('version:')) {
    const lockVersion = lines[4].split('version: ')[1];
    return {
      version: lockVersion <= 4 ? 2 : 3,
      skipLines: 7
    };
  }
  return {
    version: undefined,
    skipLines: undefined
  };
};

const constructClassicEntry = entryLines => {
  const keys = entryLines[0].replaceAll(':', '').split(',');

  const dependencies = entryLines[4]
    ? Object.assign(
        {},
        ...entryLines.splice(5).map(dependencyLine => {
          const parts = dependencyLine.trim().split(' ');
          if (parts.length === 2) {
            return {
              [parts[0]]: parts[1]
            };
          } else {
            return {};
          }
        })
      )
    : undefined;

  const entryObject = {
    version: findLockLineValue(entryLines, 'version'),
    resolved: findLockLineValue(entryLines, 'resolved'),
    integrity: findLockLineValue(entryLines, 'integrity'),
    dependencies
  };

  return Object.assign({}, ...keys.map(key => ({ [key.trim()]: entryObject })));
};

const findLockLineValue = (lines, keyString) => {
  const foundLine = lines.find(line => line.includes(`${keyString} `));
  return foundLine ? foundLine.split(`${keyString} `)[1] : undefined;
};

const constructBerryEntry = entryLines => {
  const keys = entryLines[0]
    .replaceAll('@npm:', '@')
    .replaceAll('@yarn:', '@')
    .replaceAll('@workspace:', '@')
    .replaceAll(':', '')
    .split(',');

  const version = findLockLineValue(entryLines, 'version:');
  const isLocal = version.includes('use.local');

  const endFields = entryLines.splice(isLocal ? -3 : -4);
  const peerBlockStart = entryLines.findIndex(entry => entry.includes('peerDependencies:'));
  const peerFields =
    peerBlockStart !== -1 ? entryLines.splice(-(entryLines.length - peerBlockStart)) : undefined;

  const dependenciesBlockStart = entryLines.findIndex(entry => entry.includes('dependencies:'));
  const dependencies =
    dependenciesBlockStart !== -1
      ? Object.assign({}, ...entryLines.splice(4).map(parseDependencyLine))
      : undefined;

  const peerBlockEnd =
    peerFields && peerFields.findIndex(entry => entry.includes('peerDependenciesMeta:'));
  const peerDependencies =
    peerFields && peerFields[0]?.includes('peerDependencies:')
      ? Object.assign(
          {},
          ...peerFields.splice(-(peerFields.length - peerBlockEnd)).map(parseDependencyLine)
        )
      : undefined;

  const integrity = !isLocal && endFields[0].split('checksum: ')[1];
  const resolution = findLockLineValue(entryLines, 'resolution:');

  const entryObject = {
    version,
    resolved: resolution.includes('@workspace:') ? 'workspace' : resolution,
    integrity,
    language: endFields[isLocal ? 0 : 1].split('languageName: ')[1],
    link: endFields[isLocal ? 1 : 2].split('linkType: ')[1],
    dependencies,
    peerDependencies
  };

  return Object.assign({}, ...keys.map(key => ({ [key.trim()]: entryObject })));
};

const parseDependencyLine = dependencyLine => {
  const parts = dependencyLine.trim().split(' ');
  if (parts.length === 2) {
    return {
      [parts[0]]: parts[1]
    };
  } else {
    return {};
  }
};

export const parseLock = content => {
  const lines = content.replaceAll('\r', '').replaceAll('"', '').split('\n');

  const metadata = detectYarnVersion(lines);

  if (!metadata) {
    warning('Unsupported Yarn lock version! Please report this issue in the action repository.');
    return {
      type: 'error',
      object: {}
    };
  }

  const cleanedLines = lines.slice(metadata.skipLines);
  const maxIndex = cleanedLines.length - 1;

  const entryChunks = [];
  cleanedLines.reduce((previousValue, currentValue, currentIndex) => {
    if (currentValue !== '' && currentIndex !== maxIndex) {
      return [...previousValue, currentValue];
    } else {
      entryChunks.push([...previousValue, currentValue]);
      return [];
    }
  }, []);

  const result = entryChunks
    .filter(entryLines => entryLines.length >= 4)
    .map(entryLines =>
      metadata.version === 1 ? constructClassicEntry(entryLines) : constructBerryEntry(entryLines)
    )
    .filter(Boolean);

  // Retain the official parser result structure for a while
  return {
    type: 'success',
    object: Object.assign({}, ...result)
  };
};

export const diffLocks = (previous, current) => {
  const changes = {};
  const previousPackages = formatLockEntry(previous);
  const currentPackages = formatLockEntry(current);

  Object.keys(previousPackages).forEach(key => {
    changes[key] = {
      previous: previousPackages[key].version,
      current: '-',
      status: STATUS.REMOVED
    };
  });

  Object.keys(currentPackages).forEach(key => {
    if (!changes[key]) {
      changes[key] = {
        previous: '-',
        current: currentPackages[key].version,
        status: STATUS.ADDED
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
