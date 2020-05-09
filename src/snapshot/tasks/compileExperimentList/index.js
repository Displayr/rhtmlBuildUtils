const compileES6 = require('../../../build/lib/compileES6')
const { basePath } = require('../../../build/lib/widgetConfig')
const path = require('path')

module.exports = function (gulp) {
  return function (callback) {
    const entryPointFile = path.join(__dirname, 'renderListOfExperiments.js')
    const destinationDirectory = path.join(basePath, 'browser/js/')
    compileES6({ gulp, callback, entryPointFile, destinationDirectory })
  }
}
