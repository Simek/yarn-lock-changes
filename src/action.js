const { getInput, setFailed } = require('@actions/core');
const { context, getOctokit } = require('@actions/github');
const lockfile = require('@yarnpkg/lockfile');
const fs = require('fs');
const { Base64 } = require('js-base64');
const path = require('path');

const { STATUS, countStatuses, createTable, createSummary, diffLocks } = require('./utils');

const COMMENT_HEADER = '## `yarn.lock` changes';

const getBooleanInput = (input) => {
  const trueValues = ['true', 'yes', 'y', 'on'];
  const falseValues = ['false', 'no', 'n', 'off'];
  const inputValue = getInput(input).toLowerCase();

  if (trueValues.includes(inputValue)) {
    return true;
  } else if (falseValues.includes(inputValue)) {
    return false;
  }

  throw TypeError(`💥 Wrong boolean value of the input '${input}', aborting!`);
};

const getCommentId = async (octokit, oktokitParams, issueNumber) => {
  const currentComments = await octokit.issues.listComments({
    ...oktokitParams,
    issue_number: issueNumber,
    per_page: 100
  });

  if (!currentComments || !currentComments.data) {
    throw Error('💥 Cannot fetch PR comments, aborting!');
  }

  return currentComments.data
    .filter(
      ({ user, body }) => user.login === 'github-actions[bot]' && body.startsWith(COMMENT_HEADER)
    )
    .map(({ id }) => id)[0];
};

const getBasePathFromInput = (input) =>
  input.lastIndexOf('/') ? input.substring(0, input.lastIndexOf('/')) : '';

const getLockBlobContent = async (octokit, { user, repo, sha, label }) => {
  const branchTree = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{branch}:{path}', {
    owner: user,
    repo,
    branch: sha,
    path: getBasePathFromInput(getInput('path'))
  });

  if (!branchTree || !branchTree.data || !branchTree.data.tree) {
    throw Error(`💥 Cannot fetch '${label}' tree, aborting!`);
  }

  const lockSHA = branchTree.data.tree.filter((file) => file.path === 'yarn.lock')[0].sha;
  const lockData = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
    owner: user,
    repo,
    branch: sha,
    file_sha: lockSHA
  });

  if (!lockData || !lockData.data || !lockData.data.content) {
    throw Error(`💥 Cannot fetch lock from '${label}' branch, aborting!`);
  }

  return lockfile.parse(Base64.decode(lockData.data.content));
};

const getLockLocalContent = async (inputPath) => {
  const lockPath = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(lockPath)) {
    throw Error('💥 It looks like lock file does not exist in this PR, aborting!');
  }

  return lockfile.parse(await fs.readFileSync(lockPath, { encoding: 'utf8' }));
};

const run = async () => {
  try {
    const octokit = getOctokit(getInput('token', { required: true }));
    const inputPath = getInput('path');
    const updateComment = getBooleanInput('updateComment');
    const failOnDowngrade = getBooleanInput('failOnDowngrade');
    const useCheckout = getBooleanInput('useCheckout');
    const collapsibleThreshold = Math.max(parseInt(getInput('collapsibleThreshold'), 10), 0);

    const { owner, repo, number } = context.issue;
    const { base, head } = context.payload.pull_request;
    const oktokitParams = { owner, repo };

    if (!number) {
      throw Error('💥 Cannot find the PR, aborting!');
    }

    const updatedLock = useCheckout
      ? await getLockLocalContent(inputPath)
      : await getLockBlobContent(octokit, head);

    const masterLock = getLockBlobContent(octokit, base);
    const lockChanges = diffLocks(masterLock, updatedLock);
    const lockChangesCount = Object.keys(lockChanges).length;

    const commentId = updateComment
      ? await getCommentId(octokit, oktokitParams, number)
      : undefined;

    if (lockChangesCount) {
      let diffsTable = createTable(lockChanges);

      if (diffsTable.length >= 64000) {
        diffsTable = createTable(lockChanges, true);
      }

      const collapsed = lockChangesCount >= collapsibleThreshold;
      const changesSummary = collapsed ? '### Summary\n' + createSummary(lockChanges) : '';

      const body =
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

      if (updateComment) {
        if (commentId) {
          await octokit.issues.updateComment({
            ...oktokitParams,
            comment_id: commentId,
            body
          });
        } else {
          await octokit.issues.createComment({
            ...oktokitParams,
            issue_number: number,
            body
          });
        }
      } else {
        await octokit.issues.createComment({
          ...oktokitParams,
          issue_number: number,
          body
        });
      }
    } else {
      if (updateComment && commentId) {
        await octokit.issues.deleteComment({
          ...oktokitParams,
          comment_id: commentId
        });
      }
    }

    if (failOnDowngrade && countStatuses(STATUS.DOWNGRADED)) {
      throw Error('🚨 Downgrade detected, failing the action!');
    }
  } catch (error) {
    setFailed(error.message);
  }
};

run();
