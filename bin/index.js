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
  .action(fuzzDirs);

program
  .command('repo <workdir>')
  .option('-R, --no-root', 'should we use git root or directory')
  .option('-f, --from <type>', 'branch you would like to compare from', 'develop')
  .description('Perform git checks on workdir')
  .action(async (workdir, options) => {
    try {
      // TODO remove it from latest build
      await repo(workdir, [['packages'], ['projects/login', 'projects/nginx-serve-spa']], options);
    } catch (err) {
      error(err.message);
    }
  });

// TODO add fail if passed nothing
program
  .option('-w, --workdir <type>', 'git repo', './')
  .option('-R, --no-root', 'should we use git root or directory')
  .option('-f, --from <type>', 'branch you would like to compare from', 'develop')
  .command('*')
  .arguments('<dir> [otherDirs...]')
  .action(async (dir, otherDirs, { parent: options }) => {
    // TODO use https://github.com/SBoudrias/Inquirer.js/ to have inputs on main app
    try {
      const foundDirs = await fuzzDirs(options.workdir, [dir, ...otherDirs]);
      await repo(options.workdir, foundDirs, options);
    } catch (err) {
      error(err.message);
    }
  });

try {
  program.parse(process.argv);
} catch (err) {
  error(err.message);
}
