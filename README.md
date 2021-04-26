# Yarn Lock Changes

Creates a comment inside Pull Request with the human-readable summary of changes to the `yarn.lock`.

<img width="572" alt="Screenshot 2021-04-26 201617" src="https://user-images.githubusercontent.com/719641/116132125-78cadf80-a6cd-11eb-901d-7f3cb6efd1c9.png">

## Usage

```yml
- name: Yarn Lock Changes
  uses: Simek/yarn-lock-changes@main # for now, use `main` before the stable release will be published as `v1`
  with:
    path: 'yarn.lock'
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `path` | No | Path in repository to the `yarn.lock` file. Default `yarn.lock` (project root). |
| `token` | **Yes** | GitHub token for the bot, so it can publish a comment in the pull request. |
