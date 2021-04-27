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

const getStatusLabel = (status) =>
  `[<sub><img alt="${status.toUpperCase()}" src="${ASSETS_URL}/${status}.svg" height="16" /></sub>](#)`;

const formatNameAndVersion = (obj) =>
  Object.fromEntries(
    Object.keys(obj.object).map((key) => {
      const nameParts = key.split('@');
      const name = nameParts[0] === '' ? '@' + nameParts[1] : nameParts[0];
      return [name, { name, version: obj.object[key].version }];
    })
  );

const diffLocks = (previous, current) => {
  const changes = {};
  const previousPackages = formatNameAndVersion(previous);
  const currentPackages = formatNameAndVersion(current);

  Object.keys(previousPackages).forEach((key) => {
    changes[key] = {
      previous: previousPackages[key].version,
      current: '-',
      status: getStatusLabel('removed')
    };
  });

  Object.keys(currentPackages).forEach((key) => {
    if (!changes[key]) {
      changes[key] = {
        previous: '-',
        current: currentPackages[key].version,
        status: getStatusLabel('added')
      };
    } else {
      if (changes[key].previous === currentPackages[key].version) {
        delete changes[key];
      } else {
        changes[key].current = currentPackages[key].version;
        if (compareVersions(changes[key].previous, changes[key].current) === 1) {
          changes[key].status = getStatusLabel('downgraded');
        } else {
          changes[key].status = getStatusLabel('updated');
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
        .map(([key, { status, previous, current }]) => ['`' + key + '`', status, previous, current])
        .sort((a, b) => a[0].localeCompare(b[0]))
    ],
    { align: ['l', 'c', 'c', 'c'], alignDelimiters: false }
  );

const run = async () => {
  try {
    const octokit = github.getOctokit(core.getInput('token'));
    const inputPath = core.getInput('path');

    const { owner, repo, number } = github.context.issue;

    if (!number) {
      throw new Error('Cannot find the PR!');
    }

    const lockPath = path.resolve(process.cwd(), inputPath);

    if (!fs.existsSync(lockPath)) {
      throw new Error(`${lockPath} does not exist!`);
    }

    const content = await fs.readFileSync(lockPath, { encoding: 'utf8' });
    const updatedLock = lockfile.parse(content);

    const masterLockResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: inputPath
    });

    const masterLock = lockfile.parse(Base64.decode(masterLockResponse.data.content));
    const lockChanges = diffLocks(masterLock, updatedLock);

    if (Object.keys(lockChanges).length) {
      const diffsTable = createTable(lockChanges);
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: number,
        body: '## `yarn.lock` changes' + '\n' + diffsTable
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
