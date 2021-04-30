const { getInput, setFailed } = require('@actions/core');
const { context, getOctokit } = require('@actions/github');
const lockfile = require('@yarnpkg/lockfile');
const fs = require('fs');
const { Base64 } = require('js-base64');
const path = require('path');

const { createTable, createSummary, diffLocks } = require('./utils');

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

const run = async () => {
  try {
    const octokit = getOctokit(getInput('token', { required: true }));
    const inputPath = getInput('path');
    const updateComment = getBooleanInput('updateComment');
    const collapsibleThreshold = Math.max(parseInt(getInput('collapsibleThreshold'), 10), 0);

    const { owner, repo, number } = context.issue;
    const oktokitParams = { owner, repo };

    console.warn(context.payload.repository.default_branch, inputPath.lastIndexOf('/') ? inputPath.substring(0, inputPath.lastIndexOf('/')) : '')
    console.warn(await octokit.request('GET /repos/<owner>/<repo>/git/trees/<branch>:<path>', {
      ...oktokitParams,
      branch: context.payload.repository.default_branch,
      path: inputPath.lastIndexOf('/') ? inputPath.substring(0, inputPath.lastIndexOf('/')) : ''
    }))

    if (!number) {
      throw Error('💥 Cannot find the PR, aborting!');
    }

    const lockPath = path.resolve(process.cwd(), inputPath);

    if (!fs.existsSync(lockPath)) {
      throw Error('💥 It looks like lock does not exist in this PR, aborting!');
    }

    const content = await fs.readFileSync(lockPath, { encoding: 'utf8' });
    const updatedLock = lockfile.parse(content);

    const masterLockResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      ...oktokitParams,
      path: inputPath
    });

    if (!masterLockResponse || !masterLockResponse.data || !masterLockResponse.data.content) {
      throw Error('💥 Cannot fetch base lock, aborting!');
    }

    const masterLock = lockfile.parse(Base64.decode(masterLockResponse.data.content));
    const lockChanges = diffLocks(masterLock, updatedLock);
    const lockChangesCount = Object.keys(lockChanges).length;

    if (lockChangesCount) {
      let diffsTable = createTable(lockChanges);

      if (diffsTable.length >= 64000) {
        diffsTable = createTable(lockChanges, true);
      }

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

      if (updateComment) {
        const commentId = await getCommentId(octokit, oktokitParams, number);

        if (commentId) {
          await octokit.issues.updateComment({
            ...oktokitParams,
            comment_id: commentId,
            body: commentBody
          });
        } else {
          await octokit.issues.createComment({
            ...oktokitParams,
            issue_number: number,
            body: commentBody
          });
        }
      } else {
        await octokit.issues.createComment({
          ...oktokitParams,
          issue_number: number,
          body: commentBody
        });
      }
    } else {
      if (updateComment) {
        const commentId = await getCommentId(octokit, oktokitParams, number);

        if (commentId) {
          await octokit.issues.deleteComment({
            ...oktokitParams,
            comment_id: commentId
          });
        }
      }
    }
  } catch (error) {
    setFailed(error.message);
  }
};

run();
