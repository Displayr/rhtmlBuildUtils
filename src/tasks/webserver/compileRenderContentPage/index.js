const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const compileES6 = require('../../../lib/compileES6')
const createFileFromTemplate = require('../../../lib/createFileFromTemplate')
const { basePath, widgetFactory, internalWebSettings } = require('../../../lib/widgetConfig')

// NB widget_definition_path is a JS module specifier embedded in the generated source, not a
// filesystem path. Module specifiers always use '/' on every platform, and a windows '\' would
// be interpreted as a string escape in the generated require().
const toModuleSpecifier = p => p.split(path.sep).join('/')

const templateVariables = _.merge(
  {},
  internalWebSettings,
  { widget_definition_path: path.posix.join('..', toModuleSpecifier(widgetFactory)) }
)

module.exports = () => {
  return function (callback) {
    const entryPointFile = path.join(basePath, '.tmp/renderContentPage.js')

    // step 1: apply vars to template, and save output in .tmp
    createFileFromTemplate({
      templateFile: path.join(__dirname, './renderContentPage.template.js'),
      destinationFile: entryPointFile,
      templateVariables
    })

    // step 2: esbuild, which bundles all the code into single file for browser testing
    const destinationDirectory = path.join(basePath, 'browser/js/')
    fs.mkdirsSync(destinationDirectory)
    return compileES6({ entryPointFile, destinationDirectory, minify: false, callback })
  }
}
