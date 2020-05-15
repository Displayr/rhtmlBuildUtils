const path = require('path')
const createFileFromTemplate = require('../../../lib/createFileFromTemplate')
const { basePath, internalWebSettings } = require('../../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (done) {
    createFileFromTemplate({
      templateFile: path.join(__dirname, './renderExample.template.html'),
      destinationFile: path.join(basePath, 'browser/renderExample.html'),
      templateVariables: internalWebSettings
    })
    done()
  }
}
