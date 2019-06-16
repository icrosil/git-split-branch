const readdirp = require('readdirp');
const FuzzySearch = require('fuzzy-search');
const inquirer = require('inquirer');

const { notice, info } = require('./log');
const sequential = require('./utils/sequential');

const fuzzDirs = async (workdir, dirsToLookup, options) => {
  if (!workdir) {
    throw new Error('workdir not passed');
  }
  if (!dirsToLookup || dirsToLookup.length === 0) {
    throw new Error('nothing to lookup');
  }
  info('looking in dir ', workdir);
  info(`Searching with ${options.findDepth} depth`);
  const dirs = await readdirp.promise(workdir, {
    type: 'directories',
    depth: options.findDepth,
    directoryFilter: ['!.git', '!*modules'],
  });
  const fuzzy = new FuzzySearch(dirs, ['path']);
  const bestDirsPaths = await sequential(
    dirsToLookup.map(currentDirs => async () => {
      return sequential(
        currentDirs.map(currentDir => async () => {
          const bestDirs = fuzzy.search(currentDir);
          if (bestDirs.length === 0) {
            if (!options.maximumDepth) {
              const answer = await inquirer.prompt([
                {
                  message: `We didn't found any matching dir, do you want to go deeper than ${options.findDepth}?`,
                  type: 'confirm',
                  name: 'goDeep',
                  default: true,
                },
              ]);
              if (answer.goDeep) {
                throw new Error('go deeper');
              }
            }
            throw new Error(`workdir ${workdir} does not contain directory like ${currentDir}`);
          }
          const dirAnswer = await inquirer.prompt([
            {
              message: `Please confirm found directory`,
              choices: bestDirs.map(({ path }) => path),
              type: 'list',
              name: 'correctDir',
              default: bestDirs[0],
            },
          ]);
          const bestDirFuse = dirAnswer.correctDir;
          info(`best match for ${currentDir} is ${bestDirFuse}`);
          return bestDirFuse;
        }),
      );
    }),
  );
  notice(bestDirsPaths.join(' & '));
  return bestDirsPaths;
};

module.exports = async (workdir, dirsToLookup = [], options) => {
  const allDirsPassed = dirsToLookup.map(currentDir => {
    return currentDir.split(';');
  });
  try {
    const foundDirs = await fuzzDirs(workdir, allDirsPassed, options);
    return foundDirs;
  } catch (error) {
    if (error.message === 'go deeper') {
      notice(`Going deeper, next level - ${options.findDepth + 3}`);
      const foundDirs = await fuzzDirs(
        workdir,
        allDirsPassed,
        Object.assign({}, options, { findDepth: options.findDepth + 3, maximumDepth: true }),
      );
      return foundDirs;
    }
  }
  return null;
};
