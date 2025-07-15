import { context } from "@actions/github";
import { FILE_PATHS } from "./constants";
import { execFileSync, execSync } from "child_process";
import { globSync } from "tinyglobby";
import { setOutput } from "@actions/core";

(async () => {
  if (!FILE_PATHS.length) {
    throw new Error("No file paths provided. Please set the file-paths input.");
  }

  const baseBranch = context.payload.pull_request?.base?.ref || "main";
  console.log(`Comparing changes wtih base branch: ${baseBranch}`);

  console.log(`Fetching ${baseBranch} branch...`);
  execFileSync("git", ["fetch", "origin", baseBranch], { stdio: 'inherit' });

  const matchedFiles = globSync(FILE_PATHS, {
    absolute: false,
    onlyFiles: true
  });

  const filesChanged = execSync('git diff --name-only FETCH_HEAD HEAD').toString()
  .trim()
  .split('\n');

  console.log('Files changed');
  filesChanged.forEach(file => console.log(file));

  const filesFound = matchedFiles.filter(file => filesChanged.includes(file));

  if (filesFound.length) {
    console.log(`\nFound ${filesFound.length} matching files:`);
    filesFound.forEach(file => console.log(file));
  } else {
    console.log("\nNo matching files found.");
  }

  console.log(`files_changed: ${filesChanged.length > 0}`);
  setOutput('files_changed', filesChanged.length > 0);
})();
