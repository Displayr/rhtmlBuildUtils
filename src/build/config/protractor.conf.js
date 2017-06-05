const path = require('path')
const appRootDir = require('app-root-dir').get()
const testVisualConfig = {
  'browserWidth': 1280,
  'browserHeight': 600,
  'defaultMatchTimeout': 5,
  'pageLoadWaitSeconds': 5,
  'forceFullPageScreenshot': true,
  'logLevel': 'off'
}

exports.config = {
  directConnect: true,
  framework: 'custom',
  frameworkPath: require.resolve('protractor-cucumber-framework'),
  cucumberOpts: {
    format: 'pretty',
    require: [
      path.normalize(`${__dirname}'/../../bdd/steps/**/*.steps.js`),
      path.normalize(`${appRootDir}/bdd/steps/**/*.steps.js`)
    ]
  },
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      args: [
        '--test-type'
      ]
    },
    loggingPrefs: {
      driver: 'ALL',
      server: 'ALL',
      browser: 'ALL'
    }
  },
  allScriptsTimeout: 20000,
  getPageTimeout: 20000,
  disableChecks: true,

  onPrepare () {
    global.visualDiffConfig = testVisualConfig
  }
}
