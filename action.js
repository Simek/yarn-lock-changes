const core = require('@actions/core');
const github = require('@actions/github');
const lockfile = require("@yarnpkg/lockfile");
const fs = require('fs');
const path = require('path');
const { markdownTable } = require('markdown-table');
const fetch = require('node-fetch');

const diff = (previous, current) => {
  let changes = {};

  const previousPackages = formatNameAndVersion(previous);
  const currentPackages = formatNameAndVersion(current);

  Object.keys(previousPackages).forEach((key) => {
    changes[key] = {
      previous: previousPackages[key].version,
      current: "REMOVED"
    };
  });

  Object.keys(currentPackages).forEach((key) => {
    if (!changes[key]) {
      changes[key] = {
        previous: "NEW",
        current: currentPackages[key].version
      };
    } else {
      if (changes[key].previous === currentPackages[key].version) {
        delete changes[key];
      } else {
        changes[key].current = currentPackages[key].version;
      }
    }
  });

  return changes;
}

const formatNameAndVersion = (obj) => {
  const packages = {};

  Object.keys(obj.object).forEach((key) => {
    const names = key.split("@");
    const name = names[0] === "" ? "@" + names[1] : names[0];
    packages[name] = { name, version: obj.object[key].version };
  });

  return packages;
}

async function run() {
  try {
    const octokit = github.getOctokit(core.getInput('token'));
    const { owner, repository } = github.context.repo;

    const PRId = github.context.issue.number;
    if (!PRId) {
      throw new Error('Cannot find the PR!');
    }

    // Decide if run

    // const { data } = await octokit.rest.pulls.get({
    //   owner,
    //   repo: repository,
    //   pull_number: PRId,
    // });

    console.log(repository, `https://raw.githubusercontent.com/${repository}/master/${core.getInput('path')}`)

    const lockPath = path.resolve(process.cwd(), core.getInput('path'));

    console.log(lockPath)

    if (!fs.existsSync(lockPath)) {
      throw new Error(`${lockPath} does not exist!`)
    }

    const content = await fs.readFileSync(lockPath, { encoding: 'utf8' });

    // await exec.exec('node', ['index.js', 'foo=bar']);
    const updatedLock = lockfile.parse(content);
    console.warn(updatedLock)

    const response = await fetch(`https://raw.githubusercontent.com/${repository}/master/${core.getInput('path')}`);
    const masterLock = lockfile.parse(await response.json());


    const lockChanges = this.diff(masterLock, updatedLock);


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
        \`\`\`${lockChanges}\`\`\`
        `
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();