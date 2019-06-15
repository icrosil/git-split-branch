const readdirp = require('readdirp');
const FuzzySearch = require('fuzzy-search');

const { notice, info } = require('./log');

const fuzzDirs = async (workdir, dirsToLookup) => {
  if (!workdir) {
    throw new Error('workdir not passed');
  }
  if (!dirsToLookup || dirsToLookup.length === 0) {
    throw new Error('nothing to lookup');
  }
  // TODO maybe should be mv to root as in repo
  info('looking in dir ', workdir);
  // TODO can i avoid reading all dirs before searching and check on search?
  // TODO also good optimization is to cache already read dirs and continue on new request
  // TODO do for all dirs
  const dirs = await readdirp.promise(workdir, {
    type: 'directories',
    depth: 5, // TODO configurable and proceed deeper if not found
    directoryFilter: ['!.git', '!*modules'], // TODO also configurable?
  });
  const fuzzy = new FuzzySearch(dirs, ['path']);
  const bestDirsPaths = dirsToLookup.map(currentDirs => {
    return currentDirs.map(currentDir => {
      // TODO if bestDir exist (what if not)
      // TODO add ability to select with arrows if best choice not found correctly
      const [bestDirFuse] = fuzzy.search(currentDir);
      if (!bestDirFuse || !bestDirFuse.path) {
        // TODO what if it is nested deeper than 5
        throw new Error(`workdir ${workdir} does not contain directory like ${currentDir}`);
      }
      info(`best match for ${currentDir} is ${bestDirFuse.path}`);
      return bestDirFuse.path;
    });
  });
  notice(bestDirsPaths.join(' & '));
  return bestDirsPaths;
};

module.exports = async (workdir, dirsToLookup = []) => {
  const allDirsPassed = dirsToLookup.map(currentDir => {
    return currentDir.split(';');
  });
  const foundDirs = await fuzzDirs(workdir, allDirsPassed);
  return foundDirs;
};
