# Yarn Lock Changes

Creates a comment inside Pull Request with the human-readable summary of the changes to the `yarn.lock` file.

<img alt="Screenshot 2021-04-26 201617" src="https://user-images.githubusercontent.com/719641/116132125-78cadf80-a6cd-11eb-901d-7f3cb6efd1c9.png">

## Usage

```yml
- name: Yarn Lock Changes
  # for now, use `main` before the stable release will be published as `v1`
  uses: Simek/yarn-lock-changes@main 
  with:
    path: 'yarn.lock'
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
| --- | :---: | :---: | --- |
| `collapsibleThreshold` | No | `'20'` | Number of lock changes, which will result in collapsed comment content. |
| `path` | No | `'yarn.lock'` | Path to the `yarn.lock` file in the repository. Default value points to the file at project root. |
| `token` | **Yes** | - | GitHub token for the bot, so it can publish a comment in the pull request. |
| `updateComment` | No | `'true'` | Should the bot update the summary comment. If value is other than default, bot will post new comment on each new commit. |
