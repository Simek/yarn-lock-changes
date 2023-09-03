const { markdownTable } = require('markdown-table');

const { STATUS_ORDER, countStatuses } = require('./utils');

const ASSETS_URL = {
  ADDED: 'https://git.io/J38HP',
  DOWNGRADED: 'https://git.io/J38ds',
  REMOVED: 'https://git.io/J38dt',
  UPDATED: 'https://git.io/J38dY'
};

const getStatusLabel = status =>
  `[<sub><img alt="${status}" src="${ASSETS_URL[status]}" height="16" /></sub>](#)`;

export const createTable = (lockChanges, groupByType = false, plainStatuses = false) =>
  markdownTable(
    [
      ['Name', 'Status', 'Previous', 'Current'],
      ...Object.entries(lockChanges)
        .sort((a, b) =>
          groupByType
            ? STATUS_ORDER.indexOf(a[1].status) - STATUS_ORDER.indexOf(b[1].status) ||
              a[0].localeCompare(b[0])
            : a[0].localeCompare(b[0])
        )
        .map(([key, { status, previous, current }]) => [
          '`' + key + '`',
          plainStatuses ? status : getStatusLabel(status),
          previous,
          current
        ])
    ],
    { align: ['l', 'c', 'c', 'c'], alignDelimiters: false }
  );

const createSummaryRow = (lockChanges, status) => {
  const statusCount = countStatuses(lockChanges, status);
  return statusCount ? [getStatusLabel(status), statusCount] : undefined;
};

export const createSummary = lockChanges =>
  markdownTable(
    [
      ['Status', 'Count'],
      ...STATUS_ORDER.map(status => createSummaryRow(lockChanges, status))
    ].filter(Boolean),
    { align: ['l', 'c'], alignDelimiters: false }
  );
