const { markdownTable } = require('markdown-table');

const { STATUS, countStatuses } = require('./utils');

const ASSETS_URL = {
  ADDED: 'https://git.io/J38HP',
  DOWNGRADED: 'https://git.io/J38ds',
  REMOVED: 'https://git.io/J38dt',
  UPDATED: 'https://git.io/J38dY',
};

const getStatusLabel = (status) =>
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
          current,
        ])
        .sort((a, b) => a[0].localeCompare(b[0])),
    ],
    { align: ['l', 'c', 'c', 'c'], alignDelimiters: false }
  );

const createSummaryRow = (lockChanges, status) => {
  const statusCount = countStatuses(lockChanges, status);
  return statusCount ? [getStatusLabel(status), statusCount] : undefined;
};

export const createSummary = (lockChanges) =>
  markdownTable(
    [
      ['Status', 'Count'],
      createSummaryRow(lockChanges, STATUS.ADDED),
      createSummaryRow(lockChanges, STATUS.UPDATED),
      createSummaryRow(lockChanges, STATUS.DOWNGRADED),
      createSummaryRow(lockChanges, STATUS.REMOVED),
    ].filter(Boolean),
    { align: ['l', 'c'], alignDelimiters: false }
  );
