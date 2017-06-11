const wrapInPromiseAndLogErrors = require('../lib/wrapInPromiseAndLogErrors')

module.exports = function () {
  this.Then(/^the "(.*)" snapshot matches the baseline$/, function (snapshotName) {
    if (this.isApplitoolsEnabled()) {
      const selectorExpression = '.rhtmlwidget-outer-svg'
      return wrapInPromiseAndLogErrors(() => {
        return this.eyes.checkRegionBy(by.css(selectorExpression), snapshotName)
      })
    }
    return Promise.resolve()
  })

  this.When(/^I take all the snapshots on the page "(.*)"$/, function (contentPath) {
    function loadContentPage (_contentPath) {
      browser.get(`http://localhost:9000${_contentPath}`)
      const plotContainerPresentPromise = browser.wait(browser.isElementPresent(by.css('.rhtmlwidget-outer-svg')))
      const errorContainerPresentPromise = browser.wait(browser.isElementPresent(by.css('.rhtml-error-container')))
      return Promise.all([plotContainerPresentPromise, errorContainerPresentPromise]).then((isPresentResults) => {
        return (isPresentResults[0] || isPresentResults[1])
          ? Promise.resolve()
          : Promise.reject(new Error(`Fail to load http://localhost:9000${_contentPath}.`))
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
