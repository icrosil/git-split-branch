#!/usr/bin/env node

const program = require('commander');
const gitP = require('simple-git/promise');

const package = require('../package.json');

let dir, otherDirs;

program
  .version(package.version)
  .option('-w, --workdir <String>', 'git repo', './')
  .arguments('<dir> [otherDirs...]')
  .action(function (dirPassed, otherDirsPassed) {
    dir = dirPassed;
    otherDirs = otherDirsPassed;
  });

program.parse(process.argv);

// TODO is workdir exist
const git = gitP(program.workdir);

if (!dir) {
  throw new Error('at least 1 dir should be specified');
}

// TODO catch error
git.checkIsRepo()
  .then(async (isRepo) => {
    // TODO check everything are fine to proceed, create branches
    // TODO stop proceed if not repo
    console.log(`dir ${program.workdir} is repo = ${isRepo}`);
    const repoStatus = await git.status();
    // TODO stop proceed if not clean
    console.log({ repoStatus });
    // TODO log current branch
    // TODO find directories from dirlist in repo (even if not full path given)
    // TODO compare 2 branches by each dir like `git rev-list --reverse --no-merges develop..HEAD -- projects/login`
    // TODO add options to choose branch from to
    // TODO should I include --no-merges or no?
    // TODO check everything passed exist
    const revListRaw = await git.raw(['rev-list', '--reverse', '--no-merges', 'develop..HEAD', '--', 'projects/login']);
    const revListExample = (revListRaw || []).split('\n').slice(0, -1);
    console.log({ revListExample });
    // TODO create branch per dir (check if not exists)
    // TODO run gco HASH DIRS (this will add files from dirs to unstaged)
    // TODO stage
    // TODO get commit message by HASH - git show-branch --no-name HASH
    // TODO commit given files with given message
    // TODO repeat per HASH
    // TODO repeat per branch
  });

console.log('Dirs passed:', dir, ...otherDirs);
