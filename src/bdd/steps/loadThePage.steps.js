module.exports = function () {
  this.Before(function () {
    this.context.loadPage = function ({ configName, stateName, width = 1000, height = 1000, rerenderControls = false, border = false }) {
      const config = {
        height,
        width,
        type: 'single_widget_single_page',
        widgets: [{ config: [configName], rerenderControls, border, state: stateName }]
      }
      const configString = new Buffer(JSON.stringify(config)).toString('base64') // eslint-disable-line node/no-deprecated-api
      let url = `http://localhost:9000/renderExample.html?config=${configString}`

      browser.get(url)
      return browser.wait(browser.isElementPresent(by.css('body[widgets-ready]')))
        .then(() => {
          const pageLoadDelay = browser.params.applitools.pageLoadDelay * 1000
          console.log(`is ready done: waited for body[widgets-ready]`)
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
