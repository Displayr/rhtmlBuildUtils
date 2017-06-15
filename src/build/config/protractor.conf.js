const _ = require('lodash')
const path = require('path')
const appRootDir = require('app-root-dir').get()

/* global browser */

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
  onPrepare: function () {
    const convertKeysToBooleans = function (obj) {
      _(obj).each((value, key) => {
        if (_.isObject(value)) { convertKeysToBooleans(value) }
        if (_.isString(value)) {
          if (value === 'true') { obj[key] = true }
          if (value === 'false') { obj[key] = false }
        }
      })
    }

    convertKeysToBooleans(browser.params)
    console.log(`running with config:`)
    console.log(browser.params)
  }
}
