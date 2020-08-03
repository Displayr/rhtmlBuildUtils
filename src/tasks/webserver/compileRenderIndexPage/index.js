const fs = require('fs-extra')
const path = require('path')
const compileES6 = require('../../../lib/compileES6')
const createFileFromTemplate = require('../../../lib/createFileFromTemplate')
const { basePath, internalWebSettings } = require('../../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (callback) {
    const entryPointFile = path.join(basePath, '.tmp', 'renderIndexPage.js')

    // step 1: apply vars to template, and save output in .tmp
    createFileFromTemplate({
      templateFile: path.join(__dirname, 'renderIndexPage.template.js'),
      destinationFile: entryPointFile,
      templateVariables: internalWebSettings
    })

    // step 2: browserify, which bundles all the code into single file for browser testing
    const destinationDirectory = path.join(basePath, 'browser', 'js')
    fs.mkdirsSync(destinationDirectory)
    return compileES6({ gulp, entryPointFile, destinationDirectory, minify: false, callback })
  }
}
