# Yarn Lock Changes

Creates a comment inside Pull Request with the human-readable summary of changes to the `yarn.lock`.

<img width="398" alt="Screenshot 2021-04-26 170818" src="https://user-images.githubusercontent.com/719641/116106068-3051f880-a6b2-11eb-8f3f-33bb63e2aa1a.png">

#### Comment example
* https://github.com/Simek/yarn-lock-changes/pull/6#issuecomment-826911530

## Usage

```yml
- name: Yarn Lock Changes
  uses: Simek/yarn-lock-changes@v0
  with:
    path: 'yarn.lock'
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Description |
| --- | --- | --- |
| `path` | No | Path in repository to the `yarn.lock` file. Default `yarn.lock` (project root). |
| `token` | **Yes** | GitHub token for the bot, so it can publish a comment in the pull request. |
