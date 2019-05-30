const path = require('path')
const projectRoot = path.join('.')
const testPlansDir = path.join(projectRoot, 'theSrc', 'test_plans')
const {processTestPlans} = require('../lib/processTestPlans')

function registerTaskWithGulp (gulp) {
  return function (callback) {
    return processTestPlans(testPlansDir)
      .catch(error => {
        console.error(error)
        // this is not failing cleanly, so i am going to process.exit to make sure i notice errors
        process.exit(1)
        // callback(error.message)
      })
  }
}

module.exports = registerTaskWithGulp
