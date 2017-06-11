const _ = require('lodash')
const initializeApplitools = require('../../lib/initializeApplitools')
const ApplitoolsResultTracker = require('../../lib/applitoolsResultTracker')

const widgetConfig = require('../../../build/lib/widgetConfig')
const widgetName = widgetConfig.widgetName

const globalApplitoolsResultTracker = new ApplitoolsResultTracker()

module.exports = function () {
  this.Before('@applitools', function (scenario) {
    this.isApplitoolsEnabled = () => {
      return (_.get(browser, 'params.applitools.enabled'))
    }

    if (this.isApplitoolsEnabled()) {
      const applitoolsParameters = _.get(browser, 'params.applitools')
      globalApplitoolsResultTracker.onDiff(applitoolsParameters.onDiff)

      this.eyes = initializeApplitools.getEyes(applitoolsParameters)
      this.eyes.open(
        browser,
        widgetName,
        `${widgetName}: ${scenario.getName()}`,
        _.pick(applitoolsParameters, ['width', 'height'])
      )
    }
  })

  this.After('@applitools', function () {
    if (this.isApplitoolsEnabled()) {
      return this.eyes.close(false).then((testResults) => {
        return globalApplitoolsResultTracker.addResult(testResults)
      })
    }
  })

  this.registerHandler('AfterFeatures', function (features, callback) {
    globalApplitoolsResultTracker.processResults()
    callback()
  })
}
