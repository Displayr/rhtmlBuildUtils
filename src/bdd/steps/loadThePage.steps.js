module.exports = function () {
  this.Before(function () {
    this.context.loadPage = function ({ configName, stateName, width = 1000, height = 1000, rerenderControls = false }) {
      let url = `http://localhost:9000/renderExample.html?width=${width}&height=${height}&config=${configName}`
      if (stateName) {
        url += `&state=${stateName}`
      }
      if (rerenderControls) {
        url += '&rerenderControls=true'
      }

      browser.get(url)
      // NB : assumes you are using Template._addRootSvgToRootElement method
      return browser.wait(browser.isElementPresent(by.css('.rhtmlwidget-outer-svg')))
    }
  })

  this.Given(/^I am viewing "([^"]+)" with dimensions ([0-9]+)x([0-9]+)$/, function (configName, width, height) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height })
  })

  this.Given(/^I am viewing "([^"]+)" with state "([^"]+)" and dimensions ([0-9]+)x([0-9]+)$/, function (configName, stateName, width, height) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height, stateName })
  })

  this.Given(/^I am viewing "([^"]+)" with dimensions ([0-9]+)x([0-9]+) and rerender controls$/, function (configName, width, height) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height, rerenderControls: true })
  })

  this.Given(/^I am viewing "([^"]+)" with state "([^"]+)" and dimensions ([0-9]+)x([0-9]+) and rerender controls$/, function (configName, stateName, width, height) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height, stateName, rerenderControls: true })
  })
}
