# Yarn Lock Changes

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
| `token` | **Yes** | - | GitHub token for the bot, so it can publish a comment in the pull request. |
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
          collapsibleThreshold: '25'
          failOnDowngrade: 'false'
          path: 'yarn.lock'
          token: ${{ secrets.GITHUB_TOKEN }}
          updateComment: 'true'
```

## Preview

### Short list of changes

<img alt="Screenshot 2021-04-28 120655" src="https://user-images.githubusercontent.com/719641/116386618-3f53ba80-a81a-11eb-9438-6601d401f880.png">

### Long list of changes

<img alt="Screenshot 2021-04-28 115019" src="https://user-images.githubusercontent.com/719641/116385385-09620680-a819-11eb-857c-113f9048d856.png">
