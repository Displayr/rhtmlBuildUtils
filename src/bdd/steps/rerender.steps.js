module.exports = function () {
  this.Given(/^I rerender with config "([^"]+)"$/, function (configName) {
    this.context.configName = configName
    element(by.css(`.example-0 .rerender-config`)).clear().sendKeys(configName)
    return element(by.css(`.example-0 .rerender-button`)).click()
  })
}