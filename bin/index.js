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
  .option('-f, --from <String>', 'branch you would like to compare from', 'develop')
  .description('Perform git checks on workdir')
  .action(async (workdir, options) => {
    try {
      await repo(workdir, options);
    } catch (err) {
      error(err.message);
    }
  });

program
  .command('*')
  .option('-w, --workdir <String>', 'git repo', './')
  .arguments('<dir> [otherDirs...]')
  .action(() => {
    // TODO use https://github.com/SBoudrias/Inquirer.js/ to have inputs on main app
    console.log('nothing to do yet');
  });

// TODO add logger
try {
  program.parse(process.argv);
} catch (err) {
  error(err.message);
}
