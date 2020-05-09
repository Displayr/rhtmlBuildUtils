const Vinyl = require('vinyl')
const stream = require('stream')

const index = require('./buildContentManifest')

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
    const contentManifest = index()
    return stringSrc('contentManifest.json', JSON.stringify(contentManifest, {}, 2))
      .pipe(gulp.dest('browser/content'))
      .on('finish', done)
  }
}
