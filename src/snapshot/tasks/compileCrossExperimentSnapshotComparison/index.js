const path = require('path')
const compileES6 = require('../../../lib/compileES6')
const { basePath } = require('../../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (callback) {
    const entryPointFile = path.join(__dirname, 'renderCrossExperimentSnapshotComparison.js')
    const destinationDirectory = path.join(basePath, 'browser/js/')
    compileES6({ gulp, callback, entryPointFile, destinationDirectory })
  }
}
