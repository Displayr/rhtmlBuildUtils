const path = require('path')
const { processTestPlans } = require('../lib/processTestPlans')
const widgetConfig = require('../lib/widgetConfig')

const testPlansDir = path.join(widgetConfig.basePath, widgetConfig.snapshotTesting.testplanDirectory)
function registerTaskWithGulp (gulp) {
  return function (done) {
    return processTestPlans(testPlansDir)
      .catch(error => {
        console.error(error)
        // this is not failing cleanly, so i am going to process.exit to make sure i notice errors
        process.exit(1)
        // callback(error.message)
      })
      .then(() => done())
  }
}

module.exports = registerTaskWithGulp
