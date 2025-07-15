# Files Changed Action

A GitHub action that checks if specific files have been changed in pull requests.

## 🚀 Usage

```yml
- name: Files Changed
  uses: stellasoftio/files-changed-action@v1
  with:
    file-paths: |
      packages/components/**
      some-directory/**

- name: Deploy some app
  if: steps.files-changed.outputs.files_changed == 'true'
  run: |
    echo "Deploying some app..."
    # Add your deployment commands here
```

## Inputs

| Input        | Description                                | Required | Default |
| ------------ | ------------------------------------------ | -------- | ------- | ---- |
| `file-paths` | A list of file paths to check for changes. |          | `true`  | `[]` |

## Outputs

| Output          | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `files-changed` | `true` if any of the specified files have changed, `false` otherwise. |
