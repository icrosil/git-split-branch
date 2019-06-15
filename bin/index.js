#!/usr/bin/env node

const program = require('commander');

const pack = require('../package.json');
const fuzzDirs = require('../src/fuzzDirs');
const repo = require('../src/repo');
const { error, initLog } = require('../src/log');

// TODO add fail if passed nothing
// TODO add verbose flags
// TODO add more logs (comparing what branch to what) creating branch from etc
// TODO to dirs and commits separated by ';' we could give handlers on read to avoid it later
program
  .version(pack.version)
  .option('-w, --workdir <directory>', 'git repo', './')
  .option('-R, --no-root', 'should we use git root or directory')
  .option('-f, --from <type>', 'branch you would like to compare from', 'develop')
  .option('-t, --to <branch>', 'branch you would like to compare to')
  .option('-b, --branches <branches>', 'branches you would like to commit to, separated by ";"')
  .option('-d, --debug [level]', 'logging extra information just in case, level could be specified')
  .arguments('<dir> [otherDirs...]')
  .action(async (dir, otherDirs, options) => {
    try {
      if (options.debug) {
        if (options.debug === true) {
          process.env.LOG_LEVEL = 'info';
        } else {
          process.env.LOG_LEVEL = options.debug;
        }
      }
      initLog();
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
