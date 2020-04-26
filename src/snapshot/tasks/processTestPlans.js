const path = require('path')
const { processTestPlans } = require('../lib/processTestPlans')
const widgetConfig = require('../../build/lib/widgetConfig')

const projectRoot = widgetConfig.basePath
const testPlansDir = path.join(projectRoot, widgetConfig.snapshotTesting.testplanDirectory)
const browserDir = path.join(projectRoot, 'browser')
const tmpDir = path.join(projectRoot, '.tmp')
const testPlanDestinations = [
  path.join(browserDir, 'test_plan.json'),
  path.join(tmpDir, 'test_plan.json')
]


function registerTaskWithGulp (gulp) {
  return function (done) {
    return processTestPlans(testPlansDir, testPlanDestinations)
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
