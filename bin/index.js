#!/usr/bin/env node

const program = require('commander');

const pack = require('../package.json');
const fuzzDirs = require('../src/fuzzDirs');
const repo = require('../src/repo');
const { error } = require('../src/log');

// TODO add fail if passed nothing
// TODO add verbose flags
// TODO add more logs (comparing what branch to what) creating branch from etc
program
  .version(pack.version)
  .option('-w, --workdir <directory>', 'git repo', './')
  .option('-R, --no-root', 'should we use git root or directory')
  .option('-f, --from <type>', 'branch you would like to compare from', 'develop')
  .option('-t, --to <branch>', 'branch you would like to compare to')
  .option('-b, --branches <branches>', 'branches you would like to commit to, separated by ";"')
  .arguments('<dir> [otherDirs...]')
  .action(async (dir, otherDirs, options) => {
    try {
      const foundDirs = await fuzzDirs(options.workdir, [dir, ...otherDirs]);
      await repo(options.workdir, Object.assign({}, options, { initialDirs: [dir, ...otherDirs], foundDirs }));
    } catch (err) {
      error(err.message);
    }
  });

try {
  program.parse(process.argv);
} catch (err) {
  error(err.message);
}
