const fs = require('fs-extra')
const path = require('path')

const { basePath, experimentDirectory } = require('../../../lib/widgetConfig')

// NB the gulp version passed { allowEmpty: true } because most widgets have no
// crossExperimentSnapshotComparisons.yaml and gulp.src otherwise errors on a singular glob that
// matches nothing. The existsSync check below is that flag.
module.exports = () => {
  return async function () {
    const sourceFile = path.join(basePath, experimentDirectory, 'crossExperimentSnapshotComparisons.yaml')
    if (!fs.existsSync(sourceFile)) { return }

    const destination = path.join(basePath, 'browser', 'content', path.basename(sourceFile))
    await fs.mkdirs(path.dirname(destination))
    await fs.copy(sourceFile, destination)
  }
}
