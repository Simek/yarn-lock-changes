import semverCoerce from 'semver/functions/coerce';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';

import { type BerryYarnEntry, type ClassicYarnEntry, type LockChanges, type ParsedLock, type StausType } from './types';

export const STATUS: Record<StausType, StausType> = {
  ADDED: 'ADDED',
  UPDATED: 'UPDATED',
  DOWNGRADED: 'DOWNGRADED',
  REMOVED: 'REMOVED',
};

export const STATUS_ORDER: StausType[] = [STATUS.ADDED, STATUS.UPDATED, STATUS.DOWNGRADED, STATUS.REMOVED];

export function countStatuses(lockChanges: Record<string, LockChanges>, statusToCount: string) {
  return Object.values(lockChanges).filter(({ status }) => status === statusToCount).length;
}

function formatForNameCompare(key: string) {
  return key.slice(0, key.lastIndexOf('@'));
}

function formatForVersionCompare(key: string) {
  const version = key.slice(key.lastIndexOf('@') + 1);
  return semverValid(semverCoerce(version)) ?? '0.0.0';
}

function formatLockEntry({ object }: ParsedLock): Record<string, { name: string; version: string }> {
  return Object.fromEntries(
    Object.keys(object)
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
        return [name, { name, version: object[key].version }];
      })
  );
}

function detectYarnVersion(lines: string[]) {
  if (lines[1].includes('v1')) {
    return {
      version: 1,
      skipLines: 4,
    };
  } else if (lines[4].includes('version:')) {
    const lockVersion = Number.parseInt(lines[4].split('version: ')[1]);
    return {
      version: lockVersion <= 4 ? 2 : 3,
      skipLines: 7,
    };
  }
  return {
    version: undefined,
    skipLines: undefined,
  };
}

function constructClassicEntry(entryLines: string[]): ClassicYarnEntry {
  const keys = entryLines[0].replaceAll(':', '').split(',');

  const dependencies = entryLines[4]
    ? Object.assign(
        {},
        ...entryLines.splice(5).map(dependencyLine => {
          const parts = dependencyLine.trim().split(' ');
          if (parts.length === 2) {
            return {
              [parts[0]]: parts[1],
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
    dependencies,
  };

  return Object.assign({}, ...keys.map(key => ({ [key.trim()]: entryObject })));
}

function findLockLineValue(lines: string[], keyString: string) {
  const foundLine = lines.find(line => line.includes(`${keyString} `));
  return foundLine ? foundLine.split(`${keyString} `)[1] : undefined;
}

function constructBerryEntry(entryLines: string[]): BerryYarnEntry {
  const keys = entryLines[0]
    .replace(/@(npm|yarn|workspace):/g, '@')
    .replaceAll(':', '')
    .split(',')
    .map(line => line.trim());

  const version = findLockLineValue(entryLines, 'version:');
  const isLocal = version?.includes('use.local');

  const endFields = entryLines.splice(isLocal ? -3 : -4);
  const peerBlockStart = entryLines.findIndex(entry => entry.includes('peerDependencies:'));
  const peerFields = peerBlockStart !== -1 ? entryLines.splice(-(entryLines.length - peerBlockStart)) : undefined;

  const dependenciesBlockStart = entryLines.findIndex(entry => entry.includes('dependencies:'));
  const dependencies = dependenciesBlockStart !== -1 ? entryLines.splice(4).map(parseDependencyLine) : undefined;

  const peerBlockEnd = peerFields ? peerFields.findIndex(entry => entry.includes('peerDependenciesMeta:')) : 0;
  const peerDependencies =
    peerFields && peerFields[0]?.includes('peerDependencies:')
      ? peerFields.splice(-(peerFields.length - peerBlockEnd)).map(parseDependencyLine)
      : undefined;

  const integrity = !isLocal && endFields[0].split('checksum: ')[1];
  const resolution = findLockLineValue(entryLines, 'resolution:');

  const entryObject = {
    version,
    resolved: resolution?.includes('@workspace:') ? 'workspace' : resolution,
    integrity,
    language: endFields[isLocal ? 0 : 1].split('languageName: ')[1],
    link: endFields[isLocal ? 1 : 2].split('linkType: ')[1],
    dependencies,
    peerDependencies,
  };

  return Object.assign({}, ...keys.map(key => ({ [key.trim()]: entryObject })));
}

function parseDependencyLine(dependencyLine: string) {
  const parts = dependencyLine.split(' ');
  if (parts.length === 2) {
    return {
      [parts[0]]: parts[1],
    };
  } else {
    return {};
  }
}

export function parseLock(content: string): ParsedLock {
  const lines = content.replace(/[\r"]/g, '').split('\n');

  const metadata = detectYarnVersion(lines);

  if (!metadata.version || metadata.skipLines === undefined) {
    return {
      type: 'error',
      object: {},
    };
  }

  lines.splice(0, metadata.skipLines);

  const entryConstructor = metadata.version === 1 ? constructClassicEntry : constructBerryEntry;
  const maxIndex = lines.length - 1;

  const entryChunks: string[][] = [];
  let currentChunk: string[] = [];

  lines.forEach((line, idx) => {
    currentChunk.push(line);

    if (line === '' || idx === maxIndex) {
      if (currentChunk.length >= 4) {
        entryChunks.push(currentChunk);
      }
      currentChunk = [];
    }
  });

  return {
    type: 'success',
    object: Object.assign({}, ...entryChunks.map(entryConstructor)),
  };
}

export function diffLocks(previous: ParsedLock, current: ParsedLock): Record<string, LockChanges> {
  const changes: Record<string, LockChanges> = {};
  const previousPackages = formatLockEntry(previous);
  const currentPackages = formatLockEntry(current);

  Object.keys(previousPackages).forEach(key => {
    changes[key] = {
      previous: previousPackages[key].version,
      current: '-',
      status: STATUS.REMOVED,
    };
  });

  Object.keys(currentPackages).forEach(key => {
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
}
