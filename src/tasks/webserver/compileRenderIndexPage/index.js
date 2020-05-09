const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')
const compileES6 = require('../../../lib/compileES6')
const { basePath, internalWebSettings } = require('../../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (callback) {
    // step 1: apply vars to template, and save renderContentPage in .tmp
    const templateFile = path.join(__dirname, './renderIndexPage.template.js')
    const entryPointDirectory = path.join(basePath, '.tmp')
    const entryPointFile = path.join(basePath, '.tmp/renderIndexPage.js')
    const destinationDirectory = path.join(basePath, 'browser/js/')

    fs.mkdirsSync(entryPointDirectory)
    fs.mkdirsSync(destinationDirectory)

    const templateContent = fs.readFileSync(templateFile, 'utf8')
    const output = mustache.render(templateContent, internalWebSettings)
    fs.writeFileSync(entryPointFile, output, 'utf8')

    // step 2: browserify renderIndexPage.js
    return compileES6({ gulp, entryPointFile, destinationDirectory, minify: false, callback })
  }
}
