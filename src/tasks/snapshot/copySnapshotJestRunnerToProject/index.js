const fs = require('fs-extra')
const path = require('path')
const { basePath } = require('../../../lib/widgetConfig')

const jestRunnerPath = path.join(__dirname, '../assets/takeSnapshots.jest.test.js')

// Copies the snapshot jest runner into <widget repo>/.tmp. jest refuses to run test files from inside
// node_modules, and rhtmlBuildUtils is in node_modules from the widget's point of view.
module.exports = () => {
  return async function () {
    const destination = path.join(basePath, '.tmp', path.basename(jestRunnerPath))
    await fs.mkdirs(path.dirname(destination))
    await fs.copy(jestRunnerPath, destination)
  }
}
