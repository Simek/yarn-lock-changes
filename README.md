# Yarn Lock Changes

Creates a comment inside Pull Request with the human-readable summary of changes to the `yarn.lock`.

<img width="506" alt="Screenshot 2021-04-26 154252" src="https://user-images.githubusercontent.com/719641/116092424-17dbe100-a6a6-11eb-9725-78bf42f836b4.png">

## Usage

```yml
name: Yarn Lock Changes
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
