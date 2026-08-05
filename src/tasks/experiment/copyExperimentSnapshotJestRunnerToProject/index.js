const fs = require('fs-extra')
const path = require('path')
const { basePath } = require('../../../lib/widgetConfig')

const jestRunnerPath = path.join(__dirname, '../assets/takeExperimentSnapshots.jest.test.js')

// Same reasoning as copySnapshotJestRunnerToProject: jest will not run a test file from node_modules.
module.exports = () => {
  return async function () {
    const destination = path.join(basePath, '.tmp', path.basename(jestRunnerPath))
    await fs.mkdirs(path.dirname(destination))
    await fs.copy(jestRunnerPath, destination)
  }
}
