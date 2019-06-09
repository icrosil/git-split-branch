const fs = require('fs');
const gitP = require('simple-git/promise');

const repo = (workdir, options) => {
  console.log('repo action in ', workdir);
  if (!fs.existsSync(workdir)) {
    throw new Error(`workdir ${workdir} is not exists`);
  }
  const git = gitP(workdir);
  git.checkIsRepo().then(async isRepo => {
    if (!isRepo) {
      throw new Error(`workdir ${workdir} is not a git repo`);
    }
    const repoRoot = (await git.raw(['rev-parse', '--show-toplevel'])).replace('\n', '');
    if (options.root) {
      console.log(`Switching cwd to root of repo ${repoRoot}`);
      await git.cwd(repoRoot);
    } else {
      console.log(`Leaving cwd in passed workdir ${workdir}`);
    }
    const repoStatus = await git.status();
    if (!repoStatus.isClean()) {
      throw new Error('repo is not clean, please clean all files before splitting');
    }
    // TODO log current branch
    // TODO check everything are fine to proceed, create branches
    // TODO compare 2 branches by each dir like `git rev-list --reverse --no-merges develop..HEAD -- projects/login`
    // TODO should I include --no-merges or no?
    // TODO add options to choose branch from to
    // TODO create branch per dir (check if not exists) and add ability to select names
    // const revListRaw = await git.raw(['rev-list', '--reverse', '--no-merges',
    //  'develop..HEAD', '--', 'projects/login']);
    // const revListExample = (revListRaw || []).split('\n').slice(0, -1);
    // console.log({ revListExample });
    // TODO run gco HASH DIRS (this will add files from dirs to unstaged)
    // TODO stage
    // TODO get commit message by HASH - git show-branch --no-name HASH
    // TODO commit given files with given message
    // TODO repeat per HASH
    // TODO repeat per branch
  });
};

module.exports = repo;
