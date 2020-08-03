const Vinyl = require('vinyl')
const stream = require('stream')
const fs = require('fs')
const path = require('path')

const { basePath, experimentDirectory } = require('../../../lib/widgetConfig')

const getExperimentNames = function () {
  const baseContentPath = path.join(basePath, experimentDirectory)
  if (!fs.existsSync(baseContentPath)) { return [] }
  return fs.readdirSync(baseContentPath)
    .sort()
}

function stringSrc (filename, string) {
  const src = stream.Readable({ objectMode: true })
  src._read = function () {
    this.push(new Vinyl({
      cwd: '',
      path: filename,
      contents: Buffer.from(string)
    }))
    this.push(null)
  }
  return src
}

module.exports = function (gulp) {
  return function (done) {
    const experimentManifest = getExperimentNames()
    return stringSrc('experimentManifest.json', JSON.stringify(experimentManifest, {}, 2))
      .pipe(gulp.dest('browser/content'))
      .on('finish', done)
  }
}
