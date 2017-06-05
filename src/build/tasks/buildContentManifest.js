const gutil = require('gulp-util')
const stream = require('stream')

const buildContentManifest = require('../lib/buildContentManifest')

function stringSrc (filename, string) {
  const src = stream.Readable({ objectMode: true })
  src._read = function () {
    this.push(new gutil.File({
      cwd: '',
      base: '',
      path: filename,
      contents: Buffer.from(string)
    }))
    this.push(null)
  }
  return src
}

module.exports = function (gulp) {
  return function () {
    const contentManifest = buildContentManifest()
    return stringSrc('contentManifest.json', JSON.stringify(contentManifest, {}, 2))
      .pipe(gulp.dest('browser/content'))
  }
}
