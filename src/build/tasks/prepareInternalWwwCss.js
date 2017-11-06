const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')

const {basePath, internalWebSettings} = require('../lib/widgetConfig')

module.exports = function (gulp) {
  return function () {
    const templateFile = path.join(__dirname, '../templates/internal_www.template.css')
    const destinationDirectory = path.join(basePath, 'browser/styles')
    const destinationFile = path.join(basePath, 'browser/styles/internal_www.css')

    const templateContent = fs.readFileSync(templateFile, 'utf8')
    const output = mustache.render(templateContent, internalWebSettings)

    fs.mkdirsSync(destinationDirectory)
    fs.writeFileSync(destinationFile, output, 'utf8')
  }
}
