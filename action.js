const core = require('@actions/core');
// const exec = require('@actions/exec');
const github = require('@actions/github');
const yarnDiff = require('@ksmakey/yarn-lock-diff');
const markdownTable = require('markdown-table')

async function run() {
  try {
    // Auth
    const octokit = github.getOctokit(core.getInput('token'));
    const { owner, repo, payload } = github.context.repo;

    console.log(repo, payload)

    const PRId = github.context.issue.number;
    if (!PRId) throw new Error('Cannot find the PR!');

    // Decide if run

    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: PRId,
    });

    console.log(data)

    // await exec.exec('node', ['index.js', 'foo=bar']);
    const out = new yarnDiff().run();

    // Compose comment
    const diffsTable = markdownTable([
      [
        'Name',
        'Previous',
        'Current'
      ],
      [
        "",
        "",
        ""
      ]
    ])

    // Publish comment

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: PRId,
      body:
        `## \`yarn.lock\` changes
        ${diffsTable}
        `
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();