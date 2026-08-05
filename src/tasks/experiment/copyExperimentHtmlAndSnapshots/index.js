const fs = require('fs-extra')
const path = require('path')
const fastGlob = require('fast-glob')
const { basePath, experimentDirectory } = require('../../../lib/widgetConfig')

const uiAssetDirectory = path.join(__dirname, '../assets/ui')

// NB replaces two concurrent gulp.src pipelines whose completion was detected by a setInterval polling
// a hand-maintained requiredCount of 2.
module.exports = () => {
  return async function () {
    await copyTree({
      cwd: basePath,
      patterns: [path.posix.join(experimentDirectory.split(path.sep).join('/'), '**/*')],
      destination: path.join(basePath, 'browser/experiments')
    })

    await copyTree({
      cwd: uiAssetDirectory,
      patterns: ['**/*.html', '**/*.css'],
      destination: path.join(basePath, 'browser/experiments/ui')
    })
  }
}

const copyTree = async ({ cwd, patterns, destination }) => {
  const matches = await fastGlob(patterns, { cwd })
  for (const relativeMatch of matches) {
    const outputPath = path.join(destination, relativeMatch)
    await fs.mkdirs(path.dirname(outputPath))
    await fs.copy(path.join(cwd, relativeMatch), outputPath)
  }
}
