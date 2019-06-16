const fs = require('fs');
const gitP = require('simple-git/promise');
const flatten = require('lodash/flatten');
const inquirer = require('inquirer');

const sequential = require('./utils/sequential');
const { info, notice } = require('./log');

const isWorkdirValid = async workdir => {
  info(`Checking existing of ${workdir}`);
  if (!fs.existsSync(workdir)) {
    throw new Error(`workdir ${workdir} is not exists`);
  }
  return gitP(workdir);
};

const isRepoValid = async (git, workdir) => {
  info('Verifying repository');
  return git.checkIsRepo().then(async isRepo => {
    if (!isRepo) {
      throw new Error(`workdir ${workdir} is not a git repo`);
    }
    info('Verifying repository status');
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
    return repoRoot;
  }
  notice(`Leaving cwd in passed workdir ${workdir}`);
  return workdir;
};

const cleanAfterDone = async (git, startingBranch) => {
  const repoStatus = await git.status();
  if (!repoStatus.isClean()) {
    throw new Error('repo is not clean something went wrong');
  }
  info(`Moving back to initial branch ${startingBranch}`);
  await git.checkout(startingBranch);
};

const branchLookup = async (git, options) => {
  let localBranches = await git.branchLocal();
  const startingBranch = localBranches.current;
  if (options.to) {
    info(`Using passed branch ${options.to} as current`);
    info(`Switching from ${startingBranch} to ${options.to}`);
    if (!localBranches.all.includes(options.to)) {
      throw new Error(`Branch ${options.to} not exist, cannot compare from it`);
    }
    git.checkout(options.to);
    localBranches = await git.branchLocal();
  }
  notice(`You are on ${localBranches.current} branch`);
  return { localBranches, startingBranch };
};

const getCommitsPerDirs = async (git, dirs, currentBranch, options) => {
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
  const branchSplitTo = await sequential(
    (options.branches
      ? options.branches
      : options.initialDirs.map(dir => `${localBranches.current}_${dir.replace(';', '_')}`)
    ).map((branch, dirIndex) => async () => {
      const answer = await inquirer.prompt([
        { message: `Branch for dirs ${options.foundDirs[dirIndex]}`, name: 'branchName', default: branch },
      ]);
      return answer.branchName;
    }),
  );
  if (options.branches) {
    info(`using passed branches from options ${options.branches}`);
    if (options.initialDirs.length !== branchSplitTo.length) {
      throw new Error('');
    }
  }
  await sequential(
    branchSplitTo.map(branch => async () => {
      if (localBranches.branches[branch]) {
        const answer = await inquirer.prompt([
          {
            message: `Branch ${branch} already exist, do you want to proceed?`,
            type: 'confirm',
            name: 'shouldUseExisting',
            default: false,
          },
        ]);
        if (answer.shouldUseExisting) {
          info('Using existing branch is not safe, but 🤷‍');
        } else {
          throw new Error(`branch ${branch} already exist, please pick different name or remove branch`);
        }
      } else {
        await git.checkout(['-b', branch, options.from]);
      }
    }),
  );
  notice(`Created branches ${branchSplitTo}`);
  await git.checkout(localBranches.current);
  return branchSplitTo;
};

const mvWorkdir = async options => {
  const { workdir } = options;
  const git = await isWorkdirValid(workdir);
  await isRepoValid(git, workdir);
  const newWorkdir = await mvRootRepo(git, workdir, options);
  return {
    git,
    workdir: newWorkdir,
  };
};

const repo = async (git, options) => {
  const workingDirectories = options.foundDirs;
  const { localBranches, startingBranch } = await branchLookup(git, options);
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
          await git.commit(`Added into dir ${dir} next commit: \n ${commitMessage}`);
          info(`Done with commit ${commit}`);
        }),
      );
      info(`Done with dir ${dir}`);
    }),
  );
  notice('All commits applied');
  await cleanAfterDone(git, startingBranch);
};

module.exports = {
  mvWorkdir,
  repo,
};
