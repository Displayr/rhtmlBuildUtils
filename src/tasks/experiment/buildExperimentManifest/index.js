const fs = require('fs-extra')
const path = require('path')

const { basePath, experimentDirectory } = require('../../../lib/widgetConfig')

const getExperimentNames = function () {
  const baseContentPath = path.join(basePath, experimentDirectory)
  if (!fs.existsSync(baseContentPath)) { return [] }
  return fs.readdirSync(baseContentPath)
    .filter(experimentName => !experimentName.match(/crossExperimentSnapshotComparisons.yaml/))
    .sort()
}

// NB same Vinyl-plus-stream-plus-gulp.dest plumbing as buildContentManifest used to have, for the same
// job of writing a single json file.
module.exports = () => {
  return async function () {
    const experimentManifest = getExperimentNames()
    const outputPath = path.join(basePath, 'browser', 'content', 'experimentManifest.json')
    await fs.mkdirs(path.dirname(outputPath))
    await fs.writeFile(outputPath, JSON.stringify(experimentManifest, {}, 2), 'utf8')
  }
}
