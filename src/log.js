const logInit = require('log-node');
const log = require('log');

const chalk = require('./chalk');

let isLogEnabled = false;

const initLog = () => {
  isLogEnabled = true;
  logInit();
};

// Comment1
const blendLogAndChalk = level => {
  if (!log[level]) {
    throw new Error(`level ${level} not exist in log`);
  }
  if (!chalk[level]) {
    throw new Error(`level ${level} not exist in chalk`);
  }
  return message => {
    if (!isLogEnabled) {
      initLog();
    }
    log[level](chalk[level](message));
  };
};

module.exports = {
  info: blendLogAndChalk('info'),
  notice: blendLogAndChalk('notice'),
  error: blendLogAndChalk('error'),
  initLog,
};
