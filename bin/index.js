#!/usr/bin/env node

const program = require('commander');

const pack = require('../package.json');
const fuzzDirs = require('../src/fuzzDirs');
const repo = require('../src/repo');
const { error } = require('../src/log');

program.version(pack.version);

program
  .command('find <workdir> [dirsToLookup...]')
  .description('helper to find dirs in workdir using fuzzy search')
  .action((workdir, dirsToLookup = []) => {
    const allDirsPassed = dirsToLookup.map(currentDir => {
      return currentDir.split(';');
    });
    fuzzDirs(workdir, allDirsPassed);
  });

program
  .command('repo <workdir>')
  .option('-R, --no-root', 'should we use git root or directory', false)
  .description('Perform git checks on workdir')
  .action((workdir, options) => {
    repo(workdir, options);
  });

program
  .command('*')
  .option('-w, --workdir <String>', 'git repo', './')
  .arguments('<dir> [otherDirs...]')
  .action(() => {
    console.log('nothing to do yet');
  });

// TODO add logger
try {
  program.parse(process.argv);
} catch (err) {
  error(err.message);
}
