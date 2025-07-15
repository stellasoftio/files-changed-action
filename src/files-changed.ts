import { context } from '@actions/github';
import { FILE_PATHS } from './constants';
import { execFileSync, execSync } from 'child_process';
import { globSync } from 'tinyglobby';
import { setOutput } from '@actions/core';

export function getBaseBranch(): string {
  return context.payload.pull_request?.base?.ref || 'main';
}

export function fetchBranch(branch: string): void {
  console.log(`Fetching ${branch} branch...`);
  execFileSync('git', ['fetch', 'origin', branch], { stdio: 'inherit' });
}

export function getMatchedFiles(filePaths: string[]): string[] {
  return globSync(filePaths, {
    absolute: false,
    onlyFiles: true,
  });
}

export function getChangedFiles(): string[] {
  const output = execSync('git diff --name-only FETCH_HEAD HEAD')
    .toString()
    .trim();
  return output ? output.split('\n') : [];
}

export function findMatchingFiles(
  matchedFiles: string[],
  changedFiles: string[]
): string[] {
  return matchedFiles.filter((file) => changedFiles.includes(file));
}

export function logResults(changedFiles: string[], matchingFiles: string[]): void {
  console.log('Files changed');
  changedFiles.forEach((file) => console.log(file));

  if (matchingFiles.length) {
    console.log(`\nFound ${matchingFiles.length} matching files:`);
    matchingFiles.forEach((file) => console.log(file));
  } else {
    console.log('\nNo matching files found.');
  }

  console.log(`files_changed: ${changedFiles.length > 0}`);
}

export function checkFilesChanged(): void {
  if (!FILE_PATHS.length) {
    throw new Error('No file paths provided. Please set the file-paths input.');
  }

  const baseBranch = getBaseBranch();
  console.log(`Comparing changes with base branch: ${baseBranch}`);

  fetchBranch(baseBranch);

  const matchedFiles = getMatchedFiles(FILE_PATHS);
  const filesChanged = getChangedFiles();
  const filesFound = findMatchingFiles(matchedFiles, filesChanged);

  logResults(filesChanged, filesFound);

  const hasChanges = filesFound.length > 0;
  console.log(`files_changed: ${hasChanges}`);

  setOutput('files_changed', hasChanges);
}
