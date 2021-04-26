const core = require('@actions/core');
// const exec = require('@actions/exec');
const github = require('@actions/github');
// const yarnDiff = require('@ksmakey/yarn-lock-diff');
const markdownTable = require('markdown-table');
const lockfile = require("@yarnpkg/lockfile");
const path = require('path');
const fs = require('fs');

async function run() {
  try {
    // Auth
    const octokit = github.getOctokit(core.getInput('token'));
    const { owner, repo } = github.context.repo;

    const PRId = github.context.issue.number;
    if (!PRId) throw new Error('Cannot find the PR!');

    // Decide if run

    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: PRId,
    });

    console.log(data)

    const paths = {
      base: path.resolve(process.cwd(), core.getInput('path'))
    }

    console.log(paths.base)

    if (!fs.existsSync(paths.base)) {
      throw new Error(`${paths.base} does not exist!`)
    }

    const lockContent = await fs.readFileSync(paths.base, 'utf8')

    // await exec.exec('node', ['index.js', 'foo=bar']);
    const out = lockfile.parse(lockContent);

    console.warn(out)

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