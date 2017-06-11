const path = require('path')
const childProcess = require('child_process')

var winExt = /^win/.test(process.platform) ? '.cmd' : '';

function getProtractorDir() {
  const result = require.resolve('protractor');
  if (result) {
    return path.resolve(path.join(path.dirname(result), '..', 'bin'))
  }
  throw new Error('No protractor installation found.');
}

function webdriverUpdate (opts, cb) {
  const callback = (cb ? cb : opts);
  const options = (cb ? opts : null);
  const args = ['update', '--standalone', '--no-gecko'];

  childProcess.spawn(path.resolve(getProtractorDir() + '/webdriver-manager' + winExt), args, {
    stdio: 'inherit'
  }).once('close', callback);
};

module.exports = function (gulp) {
  return webdriverUpdate
}
