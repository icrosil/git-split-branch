require('log-node')();
const log = require('log');

const chalk = require('./chalk');

const blendLogAndChalk = level => {
  if (!log[level]) {
    throw new Error(`level ${level} not exist in log`);
  }
  if (!chalk[level]) {
    throw new Error(`level ${level} not exist in chalk`);
  }
  return message => {
    log[level](chalk[level](message));
  };
};

module.exports = {
  info: blendLogAndChalk('info'),
  notice: blendLogAndChalk('notice'),
  error: blendLogAndChalk('error'),
};
