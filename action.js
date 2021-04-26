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
      current: "**REMOVED**"
    };
  });

  Object.keys(currentPackages).forEach((key) => {
    if (!changes[key]) {
      changes[key] = {
        previous: "**NEW**",
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
    const { owner, repo, number } = github.context.issue;

    if (!number) {
      throw new Error('Cannot find the PR!');
    }

    const lockPath = path.resolve(process.cwd(), core.getInput('path'));

    if (!fs.existsSync(lockPath)) {
      throw new Error(`${lockPath} does not exist!`)
    }

    const content = await fs.readFileSync(lockPath, { encoding: 'utf8' });
    const updatedLock = lockfile.parse(content);

    console.log(`https://raw.githubusercontent.com/${owner}/${repo}/master/${core.getInput('path')}`)

    // const response = await fetch(`https://raw.githubusercontent.com/${repository}/master/${core.getInput('path')}`);
    const response = await fetch(`https://raw.githubusercontent.com/Simek/wikitaxa/master/${core.getInput('path')}`);
    const masterLock = lockfile.parse(await response.text());

    const lockChanges = diff(masterLock, updatedLock);
    console.warn(lockChanges)

    // Compose comment
    const diffsTable = markdownTable([
      ['Name', 'Previous', 'Current'],
      Object.entries(lockChanges).map(([key, value]) => (
        [key, value.previous, value.current]
      ))
    ])

    // Publish comment
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body:
        `
        ## \`yarn.lock\` changes
        ${diffsTable}
        `
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();