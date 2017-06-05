module.exports = function () {
  this.When(/^Sleep ([0-9]+)$/, function (sleepSeconds) {
    return browser.sleep(sleepSeconds * 1000)
  })

  this.When(/^Sleep ([0-9]+) milliseconds$/, function (sleepMilliseconds) {
    return browser.sleep(sleepMilliseconds)
  })
}
