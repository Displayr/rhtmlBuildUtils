module.exports = function () {
  this.Given(/^I rerender with config "([^"]+)"$/, function (configName) {
    this.context.configName = configName
    console.log('about to clear .example-0 .rerender-config')
    element(by.css('.example-0 .rerender-config')).clear().sendKeys(configName)
    return element(by.css('.example-0 .rerender-button')).click()
  })
}
