const fs = require('fs-extra')
const path = require('path')
const { basePath } = require('../../../lib/widgetConfig')

const buildContentManifest = require('./buildContentManifest')

// NB this used to build a Vinyl file, wrap it in an object-mode stream.Readable, and pipe that through
// gulp.dest: about twenty lines of plumbing to write one json file to one known location.
module.exports = () => {
  return async function () {
    const contentManifest = buildContentManifest()
    const outputPath = path.join(basePath, 'browser', 'content', 'contentManifest.json')
    await fs.mkdirs(path.dirname(outputPath))
    await fs.writeFile(outputPath, JSON.stringify(contentManifest, {}, 2), 'utf8')
  }
}
