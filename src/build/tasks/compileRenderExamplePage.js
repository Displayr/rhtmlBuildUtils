const _ = require('lodash')
const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')

const widgetConfig = require('../lib/widgetConfig')

const DEFAULT_SETTINGS = {
  css: []
}

const templateVariables = _.merge({}, DEFAULT_SETTINGS, widgetConfig.internalWebSettings)

module.exports = function (gulp) {
  return function () {
    const templateFile = path.join(__dirname, '../templates/renderExample.template.html')
    const templateContent = fs.readFileSync(templateFile, 'utf8')

    const output = mustache.render(templateContent, templateVariables)
    const dest = path.join(widgetConfig.basePath, 'browser/renderExample.html')
    fs.writeFileSync(dest, output, 'utf8')
  }
}
