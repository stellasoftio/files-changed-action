import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { context } from '@actions/github';
import { setOutput } from '@actions/core';
import { execFileSync, execSync } from 'child_process';
import { globSync } from 'tinyglobby';
import {
getBaseBranch, 
fetchBranch, 
getMatchedFiles, 
getChangedFiles, 
findMatchingFiles, 
logResults, 
checkFilesChanged 
} from './files-changed';

// Mock external dependencies
vi.mock('@actions/github', () => ({
context: {
  payload: {
    pull_request: null
  }
}
}));

vi.mock('@actions/core', () => ({
setOutput: vi.fn()
}));

vi.mock('child_process', () => ({
execFileSync: vi.fn(),
execSync: vi.fn()
}));

vi.mock('tinyglobby', () => ({
globSync: vi.fn()
}));

vi.mock('./constants', () => ({
FILE_PATHS: ['src/**/*.ts', 'package.json']
}));


describe('files-changed', () => {
beforeEach(() => {
  vi.clearAllMocks();
  console.log = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getBaseBranch', () => {
  it('should return pull request base ref when available', () => {
    context.payload.pull_request = {
      base: { ref: 'develop' },
      number: 123,
    };

    const result = getBaseBranch();
    expect(result).toBe('develop');
  });

  it('should return main when no pull request context', () => {
    context.payload.pull_request = undefined;

    const result = getBaseBranch();
    expect(result).toBe('main');
  });

  it('should return main when pull request has no base', () => {
    context.payload.pull_request = {
      number: 123,
    };

    const result = getBaseBranch();
    expect(result).toBe('main');
  });
});

describe('fetchBranch', () => {
  it('should execute git fetch command with correct arguments', () => {
    fetchBranch('develop');

    expect(execFileSync).toHaveBeenCalledWith(
      'git',
      ['fetch', 'origin', 'develop'],
      { stdio: 'inherit' }
    );
    expect(console.log).toHaveBeenCalledWith('Fetching develop branch...');
  });
});

describe('getMatchedFiles', () => {
  it('should return matched files using globSync', () => {
    const mockFiles = ['src/file1.ts', 'src/file2.ts'];
    vi.mocked(globSync).mockReturnValue(mockFiles);

    const result = getMatchedFiles(['src/**/*.ts']);

    expect(globSync).toHaveBeenCalledWith(['src/**/*.ts'], {
      absolute: false,
      onlyFiles: true
    });
    expect(result).toEqual(mockFiles);
  });

  it('should handle empty file paths', () => {
    vi.mocked(globSync).mockReturnValue([]);

    const result = getMatchedFiles([]);

    expect(result).toEqual([]);
  });
});

describe('getChangedFiles', () => {
  it('should return array of changed files from git diff', () => {
    const mockOutput = 'file1.ts\nfile2.ts\nfile3.js';
    vi.mocked(execSync).mockReturnValue(Buffer.from(mockOutput));

    const result = getChangedFiles();

    expect(execSync).toHaveBeenCalledWith('git diff --name-only FETCH_HEAD HEAD');
    expect(result).toEqual(['file1.ts', 'file2.ts', 'file3.js']);
  });

  it('should return empty array when no changes', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(''));

    const result = getChangedFiles();

    expect(result).toEqual([]);
  });

  it('should handle whitespace-only output', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('   \n   '));

    const result = getChangedFiles();

    expect(result).toEqual([]);
  });
});

describe('findMatchingFiles', () => {
  it('should return files that exist in both arrays', () => {
    const matchedFiles = ['src/file1.ts', 'src/file2.ts', 'package.json'];
    const changedFiles = ['src/file1.ts', 'other/file.js', 'package.json'];

    const result = findMatchingFiles(matchedFiles, changedFiles);

    expect(result).toEqual(['src/file1.ts', 'package.json']);
  });

  it('should return empty array when no matches', () => {
    const matchedFiles = ['src/file1.ts', 'src/file2.ts'];
    const changedFiles = ['other/file.js', 'another/file.css'];

    const result = findMatchingFiles(matchedFiles, changedFiles);

    expect(result).toEqual([]);
  });

  it('should handle empty arrays', () => {
    expect(findMatchingFiles([], ['file.ts'])).toEqual([]);
    expect(findMatchingFiles(['file.ts'], [])).toEqual([]);
    expect(findMatchingFiles([], [])).toEqual([]);
  });
});

describe('logResults', () => {
  it('should log changed files and matching files when matches found', () => {
    const changedFiles = ['file1.ts', 'file2.js'];
    const matchingFiles = ['file1.ts'];

    logResults(changedFiles, matchingFiles);

    expect(console.log).toHaveBeenCalledWith('Files changed');
    expect(console.log).toHaveBeenCalledWith('file1.ts');
    expect(console.log).toHaveBeenCalledWith('file2.js');
    expect(console.log).toHaveBeenCalledWith('\nFound 1 matching files:');
    expect(console.log).toHaveBeenCalledWith('file1.ts');
    expect(console.log).toHaveBeenCalledWith('files_changed: true');
  });

  it('should log no matching files message when no matches', () => {
    const changedFiles = ['file1.ts', 'file2.js'];
    const matchingFiles: string[] = [];

    logResults(changedFiles, matchingFiles);

    expect(console.log).toHaveBeenCalledWith('Files changed');
    expect(console.log).toHaveBeenCalledWith('\nNo matching files found.');
    expect(console.log).toHaveBeenCalledWith('files_changed: true');
  });

  it('should handle no changed files', () => {
    const changedFiles: string[] = [];
    const matchingFiles: string[] = [];

    logResults(changedFiles, matchingFiles);

    expect(console.log).toHaveBeenCalledWith('files_changed: false');
  });
});

describe('checkFilesChanged', () => {
  beforeEach(() => {
    context.payload.pull_request = { base: { ref: 'main' }, number: 123 };
    vi.mocked(globSync).mockReturnValue(['src/file1.ts', 'package.json']);
    vi.mocked(execSync).mockReturnValue(Buffer.from('src/file1.ts\nother.js'));
  });

  it('should throw error when no file paths provided', () => {
    vi.doMock('./constants', () => ({
      FILE_PATHS: []
    }));

    expect(() => checkFilesChanged()).toThrowError(
      'No file paths provided. Please set the file-paths input.'
    );
  });

  it('should complete full workflow and set output to true when matches found', () => {
    checkFilesChanged();

    expect(console.log).toHaveBeenCalledWith('Comparing changes with base branch: main');
    expect(execFileSync).toHaveBeenCalledWith('git', ['fetch', 'origin', 'main'], { stdio: 'inherit' });
    expect(setOutput).toHaveBeenCalledWith('files_changed', true);
  });

  it('should set output to false when no matches found', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('other.js\nanother.css'));

    checkFilesChanged();

    expect(setOutput).toHaveBeenCalledWith('files_changed', false);
  });
});
});
