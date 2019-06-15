#!/usr/bin/env node

const program = require('commander');

const pack = require('../package.json');
const fuzzDirs = require('../src/fuzzDirs');
const repo = require('../src/repo');
const { error } = require('../src/log');

// TODO add fail if passed nothing
// TODO add verbose flags
program
  .version(pack.version)
  .option('-w, --workdir <type>', 'git repo', './')
  .option('-R, --no-root', 'should we use git root or directory')
  .option('-f, --from <type>', 'branch you would like to compare from', 'develop')
  .arguments('<dir> [otherDirs...]')
  .action(async (dir, otherDirs, options) => {
    // TODO use https://github.com/SBoudrias/Inquirer.js/ to have inputs on main app
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
