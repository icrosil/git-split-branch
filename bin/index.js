#!/usr/bin/env node

const program = require('commander');
const gitP = require('simple-git/promise');
const readdirp = require('readdirp');
const FuzzySearch = require('fuzzy-search');

const pack = require('../package.json');

const allDirsPassed = [];

program
  .version(pack.version)
  .option('-w, --workdir <String>', 'git repo', './')
  .arguments('<dir> [otherDirs...]')
  .action((dirPassed, otherDirsPassed = []) => {
    const addDirs = currentDir => {
      allDirsPassed.push(currentDir.split(';'));
    };
    [dirPassed, ...otherDirsPassed].forEach(addDirs);
  });

program.parse(process.argv);

// TODO is workdir exist
const git = gitP(program.workdir);

if (!allDirsPassed.length) {
  throw new Error('at least 1 dir should be specified');
}

// TODO catch error
// TODO modulize code
git.checkIsRepo().then(async isRepo => {
  // TODO check everything are fine to proceed, create branches
  // TODO stop proceed if not repo
  // TODO maybe i need to define root of repo 'git rev-parse --show-toplevel'
  console.log(`dir ${program.workdir} is repo = ${isRepo}`);
  // const repoStatus = await git.status();
  // TODO stop proceed if not clean
  // console.log({ repoStatus });
  const dirs = await readdirp.promise(program.workdir, {
    type: 'directories',
    depth: 5, // TODO configurable and proceed deeper if not found
    directoryFilter: ['!.git', '!*modules'], // TODO also configurable?
  });
  // TODO can i avoid reading all dirs before searching and check on search?
  // TODO also good optimization is to cache already read dirs and continue on new request
  // TODO do for all dirs
  // TODO support multiple paths in 1 dir by ;
  const fuzzy = new FuzzySearch(dirs, ['path']);
  const bestDirsPaths = allDirsPassed.map(currentDirs => {
    return currentDirs.map(currentDir => {
      const [bestDirFuse] = fuzzy.search(currentDir); // TODO if bestDir exist (what if not)
      console.log(`best match for ${currentDir} is ${bestDirFuse.path}`);
      return bestDirFuse.path;
    });
  });
  console.log({ bestDirsPaths });
  // TODO log current branch
  // TODO compare 2 branches by each dir like `git rev-list --reverse --no-merges develop..HEAD -- projects/login`
  // TODO add options to choose branch from to
  // TODO should I include --no-merges or no?
  // TODO check everything passed exist
  // const revListRaw = await git.raw(['rev-list', '--reverse', '--no-merges',
  //  'develop..HEAD', '--', 'projects/login']);
  // const revListExample = (revListRaw || []).split('\n').slice(0, -1);
  // console.log({ revListExample });
  // TODO create branch per dir (check if not exists)
  // TODO run gco HASH DIRS (this will add files from dirs to unstaged)
  // TODO stage
  // TODO get commit message by HASH - git show-branch --no-name HASH
  // TODO commit given files with given message
  // TODO repeat per HASH
  // TODO repeat per branch
});

console.log('Dirs passed:', ...allDirsPassed);
