const widgetConfig = require('../../build/lib/widgetConfig')

module.exports = function () {
  this.Before(function () {
    this.context.loadPage = function ({ configName, stateName, width = 1000, height = 1000, rerenderControls = false, border = false }) {
      let url = `http://localhost:9000/renderExample.html?width=${width}&height=${height}&config=${configName}`
      if (stateName) {
        url += `&state=${stateName}`
      }
      if (rerenderControls) {
        url += '&rerenderControls=true'
      }
      if (border) {
        url += '&border=true'
      }

      browser.get(url)
      return browser.wait(browser.isElementPresent(by.css(widgetConfig.visualRegressionSuite.isReadySelector)))
        .then(() => {
          const pageLoadDelay = browser.params.applitools.pageLoadDelay * 1000
          console.log(`is ready done: waited for ${widgetConfig.visualRegressionSuite.isReadySelector}`)
          return new Promise(resolve => setTimeout(resolve, pageLoadDelay))
        })
    }
  })

  this.Given(/^I am viewing "([^"]+)" with dimensions ([0-9]+)x([0-9]+)( and a border)?$/, function (configName, width, height, borderString) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height, border: (borderString) })
  })

  this.Given(/^I am viewing "([^"]+)" with state "([^"]+)" and dimensions ([0-9]+)x([0-9]+)( and a border)?$/, function (configName, stateName, width, height, borderString) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height, stateName, border: (borderString) })
  })

  this.Given(/^I am viewing "([^"]+)" with dimensions ([0-9]+)x([0-9]+) and rerender controls( and a border)?$/, function (configName, width, height, borderString) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height, rerenderControls: true, border: (borderString) })
  })

  this.Given(/^I am viewing "([^"]+)" with state "([^"]+)" and dimensions ([0-9]+)x([0-9]+) and rerender controls( and a border)?$/, function (configName, stateName, width, height, borderString) {
    this.context.configName = configName
    return this.context.loadPage({ configName, width, height, stateName, rerenderControls: true, border: (borderString) })
  })
}
