const request = require('request-promise')
const wrapInPromiseAndLogErrors = require('../lib/wrapInPromiseAndLogErrors')

module.exports = function () {
  this.Before(function () {
    this.context.getRecentState = function () {
      function getStateUpdates () {
        return window.stateUpdates
      }

      return browser.executeScript(getStateUpdates).then((stateUpdates) => {
        return stateUpdates[stateUpdates.length - 1]
      })
    }
  })

  this.Then(/^the final state callback should match "(.*)"$/, function (expectedStateFile) {
    if (!this.context.configName) {
      throw new Error('Cannot state match without configName')
    }

    return wrapInPromiseAndLogErrors(() => {
      const expectedStateUrl = `http://localhost:9000/data/${this.context.configName}/${expectedStateFile}.json`
      const expectedStatePromise = request(expectedStateUrl).then(JSON.parse)
      const actualStatePromise = this.context.getRecentState()

      return Promise.all([actualStatePromise, expectedStatePromise]).then(([actualState, expectedState]) => {
        this.expect(actualState).to.deep.equal(expectedState)
      })
    })
  })
}
