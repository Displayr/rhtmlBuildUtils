const _ = require('lodash')

module.exports = function () {
  this.After(function (scenario) {
    if (browser.params.browserLogs) {
      return browser.manage().logs().get('browser').then((browserLogs) => {
        const status = scenario.isSuccessful() ? 'pass' : 'fail'
        console.log(`Browser Logs for "${scenario.getName()}" (${status}):`)

        _(browserLogs).each((logLine) => {
          const type = (logLine.type.length > 0) ? ` (type: ${logLine.type})` : ''
          console.log(`  ${logLine.level}${type}: ${logLine.message}`)
        })
      })
    }
    return Promise.resolve()
  })
}
