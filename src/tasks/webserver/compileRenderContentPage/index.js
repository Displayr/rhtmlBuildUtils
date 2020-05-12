const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const compileES6 = require('../../../lib/compileES6')
const createFileFromTemplate = require('../../../lib/createFileFromTemplate')
const { basePath, widgetFactory, internalWebSettings } = require('../../../lib/widgetConfig')

const templateVariables = _.merge(
  {},
  internalWebSettings,
  { widget_definition_path: path.join('..', widgetFactory) }
)

module.exports = function (gulp) {
  return function (callback) {
    const entryPointFile = path.join(basePath, '.tmp/renderContentPage.js')

    // step 1: apply vars to template, and save output in .tmp
    createFileFromTemplate({
      templateFile: path.join(__dirname, './renderContentPage.template.js'),
      destinationFile: entryPointFile,
      templateVariables
    })

    // step 2: browserify, which bundles all the code into single file for browser testing
    const destinationDirectory = path.join(basePath, 'browser/js/')
    fs.mkdirsSync(destinationDirectory)
    return compileES6({ gulp, entryPointFile, destinationDirectory, minify: false, callback })
  }
}
