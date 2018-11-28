const _ = require('lodash')
const wrapInPromiseAndLogErrors = require('../lib/wrapInPromiseAndLogErrors')
const widgetConfig = require('../../build/lib/widgetConfig')

/* global $ */
/* global protractor */

module.exports = function () {
  this.Then(/^the "(.*)" snapshot matches the baseline$/, function (snapshotName) {
    if (this.isApplitoolsEnabled()) {
      const selectorExpression =
        widgetConfig.internalWebSettings.singleWidgetSnapshotSelector ||
        widgetConfig.internalWebSettings.isReadySelector
      return wrapInPromiseAndLogErrors(() => {
        return this.eyes.checkRegionBy(by.css(selectorExpression), snapshotName)
      })
    } else {
      const delay = _.get(browser, 'params.delay', 1000)
      return new Promise(resolve => setTimeout(resolve, delay))
    }
  })

  this.When(/^I take all the snapshots on the page "(.*)"$/, function (contentPath) {
    function loadContentPage (_contentPath) {
      const start = Date.now()
      return browser.get(`http://localhost:9000${_contentPath}`).then(() => {
        const pageLoadDelay = browser.params.applitools.pageLoadDelay * 1000
        return new Promise(resolve => setTimeout(resolve, pageLoadDelay))
      }).then(() => {
        const EC = protractor.ExpectedConditions
        const ready = $('body[widgets-ready]')
        const failed = $('.rhtml-error-container')

        const isLoaded = EC.or(EC.presenceOf(ready), EC.presenceOf(failed))
        return browser.wait(isLoaded, 30000)
          .catch(error => {
            console.log('error')
            console.log(JSON.stringify(error, {}, 2))
            throw new Error(`Fail to load http://localhost:9000${_contentPath} (after ${Date.now() - start} ms)`)
          })
      })
    }

    function takeSnapshots () {
      const donePromises = element.all(by.css('[snapshot-name]')).each((element) => {
        return element.getAttribute('snapshot-name').then((snapshotName) => {
          if (snapshotName) {
            console.log(`take snapshot ${contentPath} ${snapshotName} (css '[snapshot-name="${snapshotName}"]')`)
            if (this.isApplitoolsEnabled()) {
              return this.eyes.checkRegionBy(by.css(`[snapshot-name="${snapshotName}"]`), snapshotName)
            }
            return Promise.resolve()
          } else {
            console.error(`snapshot on page ${contentPath} missing snapshot name`)
            return Promise.resolve()
          }
        })
      })
      return donePromises.then(() => {
        console.log(`done taking snapshots on ${contentPath}`)
      })
    }

    return wrapInPromiseAndLogErrors(() => {
      return loadContentPage(contentPath)
        .then(takeSnapshots.bind(this))
    })
  })
}
