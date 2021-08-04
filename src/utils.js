const { isDebug } = require('@actions/core');
const compareVersions = require('compare-versions');
const { markdownTable } = require('markdown-table');

const ASSETS_URL = {
  ADDED: 'https://git.io/J38HP',
  DOWNGRADED: 'https://git.io/J38ds',
  REMOVED: 'https://git.io/J38dt',
  UPDATED: 'https://git.io/J38dY'
};

export const STATUS = {
  ADDED: 'ADDED',
  DOWNGRADED: 'DOWNGRADED',
  REMOVED: 'REMOVED',
  UPDATED: 'UPDATED'
};

const getStatusLabel = status =>
  `[<sub><img alt="${status}" src="${ASSETS_URL[status]}" height="16" /></sub>](#)`;

export const createTable = (lockChanges, plainStatuses = false) =>
  markdownTable(
    [
      ['Name', 'Status', 'Previous', 'Current'],
      ...Object.entries(lockChanges)
        .map(([key, { status, previous, current }]) => [
          '`' + key + '`',
          plainStatuses ? status : getStatusLabel(status),
          previous,
          current
        ])
        .sort((a, b) => a[0].localeCompare(b[0]))
    ],
    { align: ['l', 'c', 'c', 'c'], alignDelimiters: false }
  );

export const countStatuses = (lockChanges, statusToCount) =>
  Object.values(lockChanges).filter(({ status }) => status === statusToCount).length;

const createSummaryRow = (lockChanges, status) => {
  const statusCount = countStatuses(lockChanges, status);
  return statusCount ? [getStatusLabel(status), statusCount] : undefined;
};

export const createSummary = lockChanges =>
  markdownTable(
    [
      ['Status', 'Count'],
      createSummaryRow(lockChanges, STATUS.ADDED),
      createSummaryRow(lockChanges, STATUS.UPDATED),
      createSummaryRow(lockChanges, STATUS.DOWNGRADED),
      createSummaryRow(lockChanges, STATUS.REMOVED)
    ].filter(Boolean),
    { align: ['l', 'c'], alignDelimiters: false }
  );

const formatLockEntry = obj =>
  Object.fromEntries(
    Object.keys(obj.object).map(key => {
      const nameParts = key.split('@');
      const name = nameParts[0] === '' ? '@' + nameParts[1] : nameParts[0];
      return [name, { name, version: obj.object[key].version }];
    })
  );

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
        if (compareVersions(changes[key].previous, changes[key].current) === 1) {
          changes[key].status = STATUS.DOWNGRADED;
        } else {
          changes[key].status = STATUS.UPDATED;
        }
      }
    }
  });

  return changes;
};

export const isDebugMode = () =>
  isDebug() ||
  process.env['ACTIONS_RUNNER_DEBUG'] === '1' ||
  process.env['ACTIONS_STEP_DEBUG'] === '1';
