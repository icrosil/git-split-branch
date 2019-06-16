#!/usr/bin/env node

const program = require('commander');

const pack = require('../package.json');
const fuzzDirs = require('../src/fuzzDirs');
const { repo, mvWorkdir } = require('../src/repo');
const { error, initLog, notice } = require('../src/log');

function semicolonSeparatedList(value) {
  return value.split(';');
}

program
  .version(pack.version)
  .option('-w, --workdir <directory>', 'git repo', './')
  .option('-R, --no-root', 'should we use git root or directory')
  .option('-f, --from <type>', 'branch you would like to compare from', 'develop')
  .option('-t, --to <branch>', 'branch you would like to compare to')
  .option('-b, --branches <branches>', 'branches you would like to commit to, separated by ";"', semicolonSeparatedList)
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
      const { git, workdir } = await mvWorkdir(options);
      const foundDirs = await fuzzDirs(workdir, [dir, ...otherDirs]);
      await repo(git, Object.assign({}, options, { initialDirs: [dir, ...otherDirs], foundDirs, workdir }));
    } catch (err) {
      error(err.message);
    }
  });

try {
  program.parse(process.argv);
  if (!process.argv.slice(2).length) {
    notice('Required directory not found in arguments, help is here ↵');
    program.outputHelp();
  }
} catch (err) {
  error(err.message);
}
