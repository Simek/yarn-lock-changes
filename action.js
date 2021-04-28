const core = require('@actions/core');
const github = require('@actions/github');
const lockfile = require('@yarnpkg/lockfile');
const compareVersions = require('compare-versions');
const fs = require('fs');
const { Base64 } = require('js-base64');
const { markdownTable } = require('markdown-table');
const path = require('path');

const GH_RAW_URL = 'https://raw.githubusercontent.com';
const ASSETS_URL = `${GH_RAW_URL}/Simek/yarn-lock-changes/main/assets`;
const COMMENT_HEADER = '## `yarn.lock` changes';

const getStatusLabel = (status) =>
  `[<sub><img alt="${status.toUpperCase()}" src="${ASSETS_URL}/${status}.svg" height="16" /></sub>](#)`;

const formatEntry = (obj) =>
  Object.fromEntries(
    Object.keys(obj.object).map((key) => {
      const nameParts = key.split('@');
      const name = nameParts[0] === '' ? '@' + nameParts[1] : nameParts[0];
      return [name, { name, version: obj.object[key].version }];
    })
  );

const diffLocks = (previous, current) => {
  const changes = {};
  const previousPackages = formatEntry(previous);
  const currentPackages = formatEntry(current);

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

const createTable = (lockChanges) =>
  markdownTable(
    [
      ['Name', 'Status', 'Previous', 'Current'],
      ...Object.entries(lockChanges)
        .map(([key, { status, previous, current }]) => [
          '`' + key + '`',
          getStatusLabel(status),
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

const createSummary = (lockChanges) =>
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

const run = async () => {
  try {
    const octokit = github.getOctokit(core.getInput('token'));
    const inputPath = core.getInput('path');
    const updateComment = core.getInput('updateComment');
    const collapsibleThreshold = parseInt(core.getInput('collapsibleThreshold'));

    const { owner, repo, number } = github.context.issue;

    if (!number) {
      throw new Error('💥 Cannot find the PR, aborting!');
    }

    const lockPath = path.resolve(process.cwd(), inputPath);

    if (!fs.existsSync(lockPath)) {
      throw new Error('💥 It looks like lock does not exist in this PR, aborting!');
    }

    const content = await fs.readFileSync(lockPath, { encoding: 'utf8' });
    const updatedLock = lockfile.parse(content);

    const masterLockResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: inputPath
    });

    if (!masterLockResponse || !masterLockResponse.data || !masterLockResponse.data.content) {
      throw new Error('💥 Cannot fetch base lock, aborting!');
    }

    const masterLock = lockfile.parse(Base64.decode(masterLockResponse.data.content));
    const lockChanges = diffLocks(masterLock, updatedLock);
    const lockChangesCount = Object.keys(lockChanges).length;

    if (lockChangesCount) {
      const diffsTable = createTable(lockChanges);
      const collapsed = lockChangesCount >= collapsibleThreshold;

      const changesSummary = collapsed ? '### Summary\n' + createSummary(lockChanges) : '';

      const commentBody =
        COMMENT_HEADER +
        '\n' +
        changesSummary +
        '\n' +
        '<details' +
        (collapsed ? '' : ' open') +
        '>\n' +
        '<summary>Click to toggle table visibility</summary>\n<br/>\n\n' +
        diffsTable +
        '\n\n' +
        '</details>';

      if (updateComment === 'true') {
        const currentComments = await octokit.issues.listComments({
          owner,
          repo,
          issue_number: number,
          per_page: 100
        });

        if (!currentComments || !currentComments.data) {
          throw new Error('💥 Cannot fetch PR comments, aborting!');
        }

        const commentId = currentComments.data
          .filter(
            (comment) =>
              comment.user.login === 'github-actions[bot]' &&
              comment.body.startsWith(COMMENT_HEADER)
          )
          .map((comment) => comment.id)[0];

        if (commentId) {
          await octokit.issues.updateComment({
            owner,
            repo,
            comment_id: commentId,
            body: commentBody
          });
        } else {
          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: number,
            body: commentBody
          });
        }
      } else {
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: number,
          body: commentBody
        });
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
