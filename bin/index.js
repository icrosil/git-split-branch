#!/usr/bin/env node

const program = require('commander');

const package = require('../package.json');

let dir, otherDirs;

program
  .version(package.version)
  .arguments('<dir> [otherDirs...]')
  .action(function (dirPassed, otherDirsPassed) {
    dir = dirPassed;
    otherDirs = otherDirsPassed;
  });

program.parse(process.argv);

if (!dir) {
  throw new Error('at least 1 dir should be specified');
}

// TODO list directories from args
