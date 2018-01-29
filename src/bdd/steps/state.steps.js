const request = require('request-promise')
const wrapInPromiseAndLogErrors = require('../lib/wrapInPromiseAndLogErrors')

module.exports = function () {
  this.Before(function () {
    this.context.getRecentState = function () {
      function getStateUpdates () {
        if (typeof window.stateUpdates !== 'undefined') {
          return window.stateUpdates
        } else {
          throw new Error('no stateUpdates on window object. Widget lib must implement stateUpdates')
        }
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
      // TODO code is duplicated between renderContentTemplate and state.steps.js
      const expectedStateFileIsDotNotation = expectedStateFile.match(/[.]/)
      const replaceDotsWithSlashes = (inputString) => {
        return inputString.replace(/[.]/, '/')
      }

      const expectedStateUrl = (expectedStateFileIsDotNotation)
        ? `http://localhost:9000/${replaceDotsWithSlashes(expectedStateFile)}.json`
        : `http://localhost:9000/data/${this.context.configName}/${expectedStateFile}.json`

      const expectedStatePromise = request(expectedStateUrl).then(JSON.parse)
      const actualStatePromise = this.context.getRecentState()

      return Promise.all([actualStatePromise, expectedStatePromise]).then(([actualState, expectedState]) => {
        this.expect(actualState).to.deep.equal(expectedState)
      })
    })
  })
}
