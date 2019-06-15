const fs = require('fs');
const gitP = require('simple-git/promise');
const flatten = require('lodash/flatten');

const sequential = require('./utils/sequential');
const { info, notice } = require('./log');

const isWorkdirValid = async workdir => {
  info('repo action in ', workdir);
  if (!fs.existsSync(workdir)) {
    throw new Error(`workdir ${workdir} is not exists`);
  }
  return gitP(workdir);
};

const isRepoValid = async (git, workdir) => {
  return git.checkIsRepo().then(async isRepo => {
    if (!isRepo) {
      throw new Error(`workdir ${workdir} is not a git repo`);
    }
    const repoStatus = await git.status();
    if (!repoStatus.isClean()) {
      throw new Error('repo is not clean, please clean all files before splitting');
    }
  });
};

const mvRootRepo = async (git, workdir, options) => {
  const repoRoot = (await git.raw(['rev-parse', '--show-toplevel'])).replace('\n', '');
  if (options.root) {
    notice(`Switching cwd to root of repo ${repoRoot}`);
    await git.cwd(repoRoot);
  } else {
    notice(`Leaving cwd in passed workdir ${workdir}`);
  }
};

const cleanAfterDone = async (git, initialBranch) => {
  const repoStatus = await git.status();
  if (!repoStatus.isClean()) {
    throw new Error('repo is not clean something went wrong');
  }
  await git.checkout(initialBranch);
};

const branchLookup = async git => {
  const localBranches = await git.branchLocal();
  const currentBranch = localBranches.current;
  notice(`You are on ${currentBranch} branch`);
  return localBranches;
};

const getCommitsPerDirs = async (git, dirs, currentBranch, options) => {
  // TODO it maybe should fail if options.from not updated to latest available or compare only to first ancestor
  notice(`Starting compare with branch ${options.from}`);
  const commitsPerDirs = await Promise.all(
    dirs.map(dirList => {
      return Promise.all(
        dirList.map(dir =>
          git.raw(['rev-list', '--reverse', '--no-merges', `${options.from}..${currentBranch}`, '--', dir]),
        ),
      );
    }),
  );
  const splittedCommits = commitsPerDirs.map((commitList = []) =>
    commitList.map((commits = []) => commits.split('\n').slice(0, -1)),
  );
  info(`found next commits to work on ${splittedCommits}`);
  return splittedCommits;
};

const getBranchesForSplit = async (git, localBranches, options) => {
  // TODO prompt user for names with some defaults by dir names
  const branchSplitTo = ['git_split_check_login', 'git_split_check_packages'];
  branchSplitTo.forEach(branch => {
    if (localBranches.branches[branch]) {
      // TODO what if we want to proceed with existing branches?
      throw new Error(`branch ${branch} already exist, please pick different name or remove branch`);
    }
  });
  await Promise.all(branchSplitTo.map(branch => git.checkout(['-b', branch, options.from])));
  notice(`Created branches ${branchSplitTo}`);
  await git.checkout(localBranches.current);
  return branchSplitTo;
};

// TODO can i optimize it in terms of smarter git usage?
const repo = async (workdir, workingDirectories, options) => {
  const git = await isWorkdirValid(workdir);
  await isRepoValid(git, workdir);
  await mvRootRepo(git, workdir, options);
  const localBranches = await branchLookup(git);
  const branchesToSplit = await getBranchesForSplit(git, localBranches, options);
  const commitsPerDirs = await getCommitsPerDirs(git, workingDirectories, localBranches.current, options);
  const restructuredData = workingDirectories.map((dirArray, index) => {
    const branch = branchesToSplit[index];
    return dirArray.map((dir, dirIndex) => {
      const commits = commitsPerDirs[index][dirIndex];
      return {
        dir,
        branch,
        commits,
      };
    });
  });
  await sequential(
    flatten(restructuredData).map(({ dir, commits, branch }) => async () => {
      info(`Proceed dir ${dir}`);
      await git.checkout(branch);
      info(`On branch ${branch}`);
      await sequential(
        commits.map(commit => async () => {
          info(`Adding commit ${commit}`);
          const commitMessage = await git.raw(['show-branch', '--no-name', commit]);
          await git.checkout([commit, dir]);
          await git.add('./*');
          await git.commit(commitMessage); // TODO message + dir;
          info(`Done with commit ${commit}`);
        }),
      );
      info(`Done with dir ${dir}`);
    }),
  );
  notice('All commits applied');
  await cleanAfterDone(git, localBranches.current);
};

module.exports = repo;
