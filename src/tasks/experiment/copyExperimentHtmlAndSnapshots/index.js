const path = require('path')
const copyTree = require('../../../lib/copyTree')
const { basePath, experimentDirectory } = require('../../../lib/widgetConfig')

const uiAssetDirectory = path.join(__dirname, '../assets/ui')

// fast-glob patterns are posix regardless of platform, so the configured directory has to be
// normalised before it can be either globbed or used as the base to strip.
const experimentDirectoryPosix = experimentDirectory.split(path.sep).join('/')

// NB replaces two concurrent gulp.src pipelines whose completion was detected by a setInterval polling
// a hand-maintained requiredCount of 2.
module.exports = () => {
  return async function () {
    // NB `base` is what keeps this at browser/experiments/<name>/... rather than
    // browser/experiments/theSrc/test/experiments/<name>/... -- the experiment UI fetches
    // /experiments/${experimentName}/testplan.yaml, so the extra levels 404 every page.
    await copyTree({
      cwd: basePath,
      patterns: [path.posix.join(experimentDirectoryPosix, '**/*')],
      base: experimentDirectoryPosix,
      destination: path.join(basePath, 'browser/experiments')
    })

    // No base here: cwd is already the asset root, so the matches carry no prefix to strip.
    await copyTree({
      cwd: uiAssetDirectory,
      patterns: ['**/*.html', '**/*.css'],
      destination: path.join(basePath, 'browser/experiments/ui')
    })
  }
}
