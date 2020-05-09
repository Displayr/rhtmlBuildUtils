const compileES6 = require('../../../lib/compileES6')
const { basePath } = require('../../../lib/widgetConfig')
const path = require('path')

module.exports = function (gulp) {
  return function (callback) {
    const entryPointFile = path.join(__dirname, 'renderListOfSnapshotsInExperiments.js')
    const destinationDirectory = path.join(basePath, 'browser/js/')
    compileES6({ gulp, callback, entryPointFile, destinationDirectory })
  }
}
