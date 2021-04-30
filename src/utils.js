const compareVersions = require('compare-versions');
const { markdownTable } = require('markdown-table');

const ASSETS_URL = 'https://raw.githubusercontent.com/Simek/yarn-lock-changes/main/assets';

const getStatusLabel = (status) =>
  `[<sub><img alt="${status.toUpperCase()}" src="${ASSETS_URL}/${status}.svg" height="16" /></sub>](#)`;

export const createTable = (lockChanges, shortStatuses = false) =>
  markdownTable(
    [
      ['Name', 'Status', 'Previous', 'Current'],
      ...Object.entries(lockChanges)
        .map(([key, { status, previous, current }]) => [
          '`' + key + '`',
          shortStatuses ? status : getStatusLabel(status),
          previous,
          current
        ])
        .sort((a, b) => a[0].localeCompare(b[0]))
    ],
    { align: ['l', 'c', 'c', 'c'], alignDelimiters: false }
  );

const countStatuses = (lockChanges, statusToCount) =>
  Object.values(lockChanges).filter(({ status }) => status === statusToCount).length;

const createSummaryRow = (lockChanges, status) => {
  const statusCount = countStatuses(lockChanges, status);
  return statusCount ? [getStatusLabel(status), statusCount] : undefined;
};

export const createSummary = (lockChanges) =>
  markdownTable(
    [
      ['Status', 'Count'],
      createSummaryRow(lockChanges, 'added'),
      createSummaryRow(lockChanges, 'updated'),
      createSummaryRow(lockChanges, 'downgraded'),
      createSummaryRow(lockChanges, 'removed')
    ].filter(Boolean),
    { align: ['l', 'c'], alignDelimiters: false }
  );

const formatLockEntry = (obj) =>
  Object.fromEntries(
    Object.keys(obj.object).map((key) => {
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
      status: 'removed'
    };
  });

  Object.keys(currentPackages).forEach((key) => {
    if (!changes[key]) {
      changes[key] = {
        previous: '-',
        current: currentPackages[key].version,
        status: 'added'
      };
    } else {
      if (changes[key].previous === currentPackages[key].version) {
        delete changes[key];
      } else {
        changes[key].current = currentPackages[key].version;
        if (compareVersions(changes[key].previous, changes[key].current) === 1) {
          changes[key].status = 'downgraded';
        } else {
          changes[key].status = 'updated';
        }
      }
    }
  });

  return changes;
};
