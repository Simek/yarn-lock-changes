const core = require('@actions/core');
const github = require('@actions/github');
const lockfile = require("@yarnpkg/lockfile");
const fs = require('fs');
const path = require('path');
const { markdownTable } = require('markdown-table');
const fetch = require('node-fetch');

const diff = (previous, current) => {
  const changes = {};
  const previousPackages = formatNameAndVersion(previous);
  const currentPackages = formatNameAndVersion(current);

  Object.keys(previousPackages).forEach((key) => {
    changes[key] = {
      previous: previousPackages[key].version,
      current: "-",
      status: "🗑️ **REMOVED**"
    };
  });

  Object.keys(currentPackages).forEach((key) => {
    if (!changes[key]) {
      changes[key] = {
        previous: "-",
        current: currentPackages[key].version,
        status: "✨ **NEW**"
      };
    } else {
      if (changes[key].previous === currentPackages[key].version) {
        delete changes[key];
      } else {
        changes[key].current = currentPackages[key].version;
        changes[key].status = "⬆️ **UPDATED**";
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
    const { owner, repo, number } = github.context.issue;
    const { default_branch } = github.context.payload.repository;

    if (!number) {
      throw new Error('Cannot find the PR!');
    }

    const lockPath = path.resolve(process.cwd(), core.getInput('path'));

    if (!fs.existsSync(lockPath)) {
      throw new Error(`${lockPath} does not exist!`)
    }

    const content = await fs.readFileSync(lockPath, { encoding: 'utf8' });
    const updatedLock = lockfile.parse(content);

    console.log(`https://raw.githubusercontent.com/${owner}/${repo}/${default_branch}/${core.getInput('path')}`)

    const response = await fetch(`https://raw.githubusercontent.com/Simek/wikitaxa/master/${core.getInput('path')}`);

    if (!response) {
      throw new Error('Cannot fetch current lock file!');
    }

    const masterLock = lockfile.parse(await response.text());

    const lockChanges = diff(masterLock, updatedLock);
    console.warn(lockChanges)

    const diffsTable = markdownTable([
      ['Name', 'Status', 'Previous', 'Current'],
      ...Object.entries(lockChanges).map(([key, value]) => (
        ['`' + key + '`', value.status, value.previous, value.current]
      )).sort((a, b) => a[0].localeCompare(b[0]))
    ])

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body: '## `yarn.lock` changes' + '\n' + diffsTable
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();