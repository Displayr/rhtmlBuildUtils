const request = require('request-promise')
const wrapInPromiseAndLogErrors = require('../lib/wrapInPromiseAndLogErrors')
const _ = require('lodash')
const deepDiff = require('deep-diff')
const widgetConfig = require('../../build/lib/widgetConfig')

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

  this.Then(/^the final state callback should match "(.*)"(?: within ([0-9.]+))?$/, function (expectedStateFile, toleranceString) {
    if (!this.context.configName) {
      throw new Error('Cannot state match without configName')
    }

    return wrapInPromiseAndLogErrors(() => {
      // TODO code is duplicated between renderContentTemplate and state.steps.js
      const expectedStateFileIsDotNotation = expectedStateFile.match(/[.]/)
      const replaceDotsWithSlashes = (inputString) => {
        return inputString.replace(/[.]/g, '/')
      }

      const expectedStateUrl = (expectedStateFileIsDotNotation)
        ? `http://localhost:9000/${replaceDotsWithSlashes(expectedStateFile)}.json`
        : `http://localhost:9000/data/${this.context.configName}/${expectedStateFile}.json`

      const { statePreprocessor } = widgetConfig.visualRegressionSuite
      const expectedStatePromise = request(expectedStateUrl).then(JSON.parse)
      const actualStatePromise = this.context.getRecentState()

      return Promise.all([actualStatePromise, expectedStatePromise]).then(([unprocessedActualState, expectedState]) => {
        const actualState = statePreprocessor(unprocessedActualState)
        const bothNumber = (a, b) => (typeof a) === 'number' && (typeof b) === 'number'
        const tolerance = (_.isUndefined(toleranceString)) ? 0 : parseFloat(toleranceString)
        const areEqual = _.isEqualWith(actualState, expectedState, (a, b) => {
          if (bothNumber(a, b)) { return Math.abs(a - b) <= tolerance }
          return undefined
        })

        if (!areEqual) {
          console.log('actualState')
          console.log(JSON.stringify(actualState, {}, 2))

          console.log('expectedState')
          console.log(JSON.stringify(expectedState, {}, 2))

          console.log('differences (left: actual, right: expected')
          console.log(JSON.stringify(deepDiff(actualState, expectedState), {}, 2))
        }
        this.expect(areEqual).to.equal(true)
      })
    })
  })
}
