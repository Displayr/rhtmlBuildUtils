const path = require('path')
const compileES6 = require('../../lib/compileES6')
const { basePath, widgetEntryPoint } = require('../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (callback) {
    const entryPointFile = path.join(basePath, widgetEntryPoint)
    const destinationDirectory = path.join(basePath, 'inst', 'htmlwidgets')
    return compileES6({ gulp, entryPointFile, destinationDirectory, minify: true, callback })
  }
}
