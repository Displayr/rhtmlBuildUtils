const _ = require('lodash')
const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')
const compileES6 = require('../lib/compileES6')
const { basePath, widgetFactory, internalWebSettings } = require('../lib/widgetConfig')

const templateVariables = _.merge(
  {},
  internalWebSettings,
  { widget_definition_path: path.join('..', widgetFactory) }
)

module.exports = function (gulp) {
  return function (callback) {
    // step 1: apply vars to template, and save renderContentPage in .tmp
    const templateFile = path.join(__dirname, '../templates/renderContentPage.template.js')
    const entryPointDirectory = path.join(basePath, '.tmp')
    const entryPointFile = path.join(basePath, '.tmp/renderContentPage.js')
    const destinationDirectory = path.join(basePath, 'browser/js/')

    fs.mkdirsSync(entryPointDirectory)
    fs.mkdirsSync(destinationDirectory)

    const templateContent = fs.readFileSync(templateFile, 'utf8')
    const output = mustache.render(templateContent, templateVariables)
    fs.writeFileSync(entryPointFile, output, 'utf8')

    // step 2: browserify renderContentPage.js, which bundles all the widget code into single file for browser testing
    return compileES6({ gulp, entryPointFile, destinationDirectory, minify: false, callback })
  }
}
