# Yarn Lock Changes

[<sub><img src="https://git.io/J38HP" height="16" /></sub>](#) [<sub><img src="https://git.io/J38dY" height="16" /></sub>](#) [<sub><img src="https://git.io/J38ds" height="16" /></sub>](#) [<sub><img src="https://git.io/J38dt" height="16" /></sub>](#)

Creates a comment inside Pull Request with the human-readable summary of the changes to the `yarn.lock` file. Works in public and private repositories, offers a degree of customization.

## Usage

```yml
- name: Yarn Lock Changes
  # for now, use `main` before the stable release will be published as `v1`
  uses: Simek/yarn-lock-changes@main 
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Required | Default | Description |
| --- | :---: | :---: | --- |
| `collapsibleThreshold` | No | `'25'` | Number of lock changes, which will result in collapsed comment content an addition of summary table. |
| `failOnDowngrade` | No | `'false'` | When a dependency downgrade is detected, fail the action. |
| `path` | No | `'yarn.lock'` | Path to the `yarn.lock` file in the repository. Default value points to the file at project root. |
| `token` | <ins>**Yes**</ins> | – | GitHub token for the bot, so it can publish a comment in the pull request. |
| `updateComment` | No | `'true'` | Update the comment on each new commit. If value is set to `'false'`, bot will post a new one on each change. |

### Workflow Example

Example below includes all the optional inputs for the action (set to their default values), if you are happy with generated output, it's safe to remove all of them (besides required `token`).

```yml
name: Yarn Lock Changes
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Yarn Lock Changes
        uses: Simek/yarn-lock-changes@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          collapsibleThreshold: '25'
          failOnDowngrade: 'false'
          path: 'yarn.lock'
          updateComment: 'true'
```

## Preview

### Basic comment appearance

<img alt="basic" src="https://user-images.githubusercontent.com/719641/116818857-c5029d80-ab6d-11eb-8b48-122b851c1d9e.png">

### Comment appearance when `collapsibleThreshold` has been reached

<img alt="summary" src="https://user-images.githubusercontent.com/719641/116819012-7efa0980-ab6e-11eb-99f1-15996b6f12b4.png">

