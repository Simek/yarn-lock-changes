import { debug, getBooleanInput, getInput, setFailed, warning } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { type operations } from '@octokit/openapi-types';
import { type Api } from '@octokit/plugin-rest-endpoint-methods';
import { Base64 } from 'js-base64';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createSummary, createTable } from './comment';
import { countStatuses, diffLocks, parseLock, STATUS } from './utils';

async function getCommentId(
  octokit: Api,
  oktokitParams: { owner: string; repo: string },
  issueNumber: number,
  commentHeader: string
) {
  const currentComments = await octokit.rest.issues.listComments({
    ...oktokitParams,
    issue_number: issueNumber,
    per_page: 100,
  });

  if (!currentComments || !currentComments.data) {
    throw Error('💥 Cannot fetch PR comments data, aborting!');
  }

  return currentComments.data
    .filter(({ user, body }) => user?.login === 'github-actions[bot]' && body?.startsWith(commentHeader))
    .map(({ id }) => id)[0];
}

function getBasePathFromInput(input: string) {
  return input.lastIndexOf('/') ? input.substring(0, input.lastIndexOf('/')) : '';
}

async function run() {
  try {
    const octokit = getOctokit(getInput('token', { required: true }));
    const inputPath = getInput('path');
    const updateComment = getBooleanInput('updateComment');
    const failOnDowngrade = getBooleanInput('failOnDowngrade');
    const groupByType = getBooleanInput('groupByType');
    const collapsibleThreshold = Math.max(Number.parseInt(getInput('collapsibleThreshold'), 10), 0);

    const { owner, repo, number } = context.issue;

    if (!number || !context.payload.pull_request) {
      throw Error('💥 Cannot find the PR data in the workflow context, aborting!');
    }

    const { ref } = context.payload.pull_request.base;
    const contextRepo = context.payload?.repository;

    if (!contextRepo) {
      throw Error('💥 Cannot find the repository data in the workflow context, aborting!');
    }

    const { default_branch } = contextRepo;

    const baseBranch = ref ?? default_branch;
    debug('Base branch: ' + baseBranch);

    const lockPath = resolve(process.cwd(), inputPath);

    if (!existsSync(lockPath)) {
      throw Error('💥 The code has not been checkout or the lock file does not exist in this PR, aborting!');
    }

    const content = readFileSync(lockPath, { encoding: 'utf8' });
    const updatedLock = parseLock(content);
    if (updatedLock.type === 'error') {
      warning('Unsupported Yarn lock version! Please report this issue in the action repository.');
    }

    const oktokitParams = { owner, repo };
    debug('Oktokit params: ' + JSON.stringify(oktokitParams));

    const basePath = getBasePathFromInput(inputPath);
    debug('Base lockfile path: ' + basePath);

    const baseTree = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{branch}:{path}', {
      ...oktokitParams,
      branch: baseBranch,
      path: basePath,
    });

    if (!baseTree || !baseTree.data || !baseTree.data.tree) {
      throw Error('💥 Cannot fetch repository base branch tree, aborting!');
    }

    const baseLockSHA = baseTree.data.tree.filter(
      (file: operations['repos/get-content']['responses']['200']['content']['application/vnd.github.object']) =>
        file.path === 'yarn.lock'
    )[0].sha;

    debug('Base lockfile SHA: ' + baseLockSHA);

    const baseLockData = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
      ...oktokitParams,
      file_sha: baseLockSHA,
    });

    if (!baseLockData || !baseLockData.data || !baseLockData.data.content) {
      throw Error('💥 Cannot fetch repository base lock file, aborting!');
    }

    const baseLock = parseLock(Base64.decode(baseLockData.data.content));
    const lockChanges = diffLocks(baseLock, updatedLock);
    const lockChangesCount = Object.keys(lockChanges).length;

    const commentHeader = '## `' + inputPath + '` changes';
    const commentId = updateComment ? await getCommentId(octokit, oktokitParams, number, commentHeader) : undefined;
    debug('Bot comment ID: ' + commentId);

    if (lockChangesCount) {
      let diffsTable = createTable(lockChanges, groupByType);

      if (diffsTable.length >= 64_000) {
        diffsTable = createTable(lockChanges, groupByType, true);
      }

      const collapsed = lockChangesCount >= collapsibleThreshold;
      const changesSummary = collapsed ? '### Summary\n' + createSummary(lockChanges) : '';

      const body =
        commentHeader +
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

      if (updateComment && commentId) {
        await octokit.rest.issues.updateComment({
          ...oktokitParams,
          comment_id: commentId,
          body,
        });
      } else {
        await octokit.rest.issues.createComment({
          ...oktokitParams,
          issue_number: number,
          body,
        });
      }
    } else {
      if (updateComment && commentId) {
        await octokit.rest.issues.deleteComment({
          ...oktokitParams,
          comment_id: commentId,
        });
      }
    }

    if (countStatuses(lockChanges, STATUS.DOWNGRADED)) {
      warning('Dependency downgrade detected!');

      if (failOnDowngrade) {
        throw Error('🚨 Dependency downgrade with `failOnDowngrade` flag set, failing the action!');
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else if (typeof error === 'string') {
      setFailed(error);
    }
  }
}

void run();
