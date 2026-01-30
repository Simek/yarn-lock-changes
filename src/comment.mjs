import { markdownTable } from 'markdown-table';

import { countStatuses, STATUS_ORDER } from './utils.mjs';

const ASSETS_URL = {
  ADDED: 'https://git.io/J38HP',
  DOWNGRADED: 'https://git.io/J38ds',
  REMOVED: 'https://git.io/J38dt',
  UPDATED: 'https://git.io/J38dY',
};

const ASSETS_WIDTH = {
  ADDED: 53,
  DOWNGRADED: 89,
  REMOVED: 66,
  UPDATED: 60,
};

function getStatusLabel(status) {
  return `[<sub><img alt="${status}" src="${ASSETS_URL[status]}" height="16" width="${ASSETS_WIDTH[status]}" /></sub>](#)`;
}

export function createTable(lockChanges, groupByType = false, plainStatuses = false) {
  return markdownTable(
    [
      ['Name', 'Status', 'Previous', 'Current'],
      ...Object.entries(lockChanges)
        .sort((a, b) =>
          groupByType
            ? STATUS_ORDER.indexOf(a[1].status) - STATUS_ORDER.indexOf(b[1].status) || a[0].localeCompare(b[0])
            : a[0].localeCompare(b[0])
        )
        .map(([key, { status, previous, current }]) => [
          '`' + key + '`',
          plainStatuses ? status : getStatusLabel(status),
          previous,
          current,
        ]),
    ],
    { align: ['l', 'c', 'c', 'c'], alignDelimiters: false }
  );
}

function createSummaryRow(lockChanges, status) {
  const statusCount = countStatuses(lockChanges, status);
  return statusCount ? [getStatusLabel(status), statusCount] : undefined;
}

export function createSummary(lockChanges) {
  return markdownTable(
    [['Status', 'Count'], ...STATUS_ORDER.map(status => createSummaryRow(lockChanges, status))].filter(Boolean),
    { align: ['l', 'c'], alignDelimiters: false }
  );
}
