const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')

const { basePath, internalWebSettings } = require('../../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (done) {
    const templateFile = path.join(__dirname, './renderExample.template.html')
    const destinationDirectory = path.join(basePath, 'browser')
    const destinationFile = path.join(basePath, 'browser/renderExample.html')

    const templateContent = fs.readFileSync(templateFile, 'utf8')
    const output = mustache.render(templateContent, internalWebSettings)

    fs.mkdirsSync(destinationDirectory)
    fs.writeFileSync(destinationFile, output, 'utf8')
    done()
  }
}
