const fs = require('fs-extra')
const path = require('path')
const createFileFromTemplate = require('../../../lib/createFileFromTemplate')
const { basePath, internalWebSettings } = require('../../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (done) {
    processInternalWwwCss()
    processIndexCss()
    done()
  }
}

const processInternalWwwCss = () => {
  createFileFromTemplate({
    templateFile: path.join(__dirname, './internal_www.template.css'),
    destinationFile: path.join(basePath, 'browser/styles/internal_www.css'),
    templateVariables: internalWebSettings
  })
}

const processIndexCss = () => {
  const cssFile = path.join(__dirname, './index.css')
  const destinationDirectory = path.join(basePath, 'browser/styles')
  const destinationFile = path.join(basePath, 'browser/styles/index.css')

  fs.mkdirsSync(destinationDirectory)
  fs.copyFileSync(cssFile, destinationFile)
}
