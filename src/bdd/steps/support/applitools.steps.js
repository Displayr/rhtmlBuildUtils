const _ = require('lodash')
const initializeApplitools = require('../../lib/initializeApplitools')

const widgetConfig = require('../../../build/lib/widgetConfig')
const widgetName = widgetConfig.widgetName

// this is duplicated in snapshots.steps.js
const isApplitoolsEnabled = () => {
  return !(_.get(browser, 'params.applitools') === 'off')
}

module.exports = function () {
  this.Before('@applitools', function (scenario) {
    if (isApplitoolsEnabled()) {
      // TODO remove global passing and use browser.params
      const applitoolsParameters = {
        width: global.visualDiffConfig.browserWidth,
        height: global.visualDiffConfig.browserHeight
      }
      this.eyes = initializeApplitools.getEyes(global.visualDiffConfig)
      this.eyes.open(browser, widgetName, `${widgetName}: ${scenario.getName()}`, applitoolsParameters)
    }
  })

  this.After('@applitools', function () {
    if (isApplitoolsEnabled()) {
      this.eyes.close(false)
    }
  })
}
