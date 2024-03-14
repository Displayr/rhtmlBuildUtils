const colors = require('ansi-colors')
const browserify = require('browserify')
const buffer = require('gulp-buffer')
const log = require('fancy-log')
const sourcemaps = require('gulp-sourcemaps')
const tap = require('gulp-tap')
const uglify = require('gulp-uglify')

module.exports = ({ gulp, entryPointFile, destinationDirectory, minify = false, callback } = {}) => {
  const browserifyStream = gulp.src(entryPointFile, { read: false })
    .pipe(tap(function (file) {
      log(`bundling ${file.path}`)

      file.contents = browserify(file.path, { debug: true })
        .bundle()
    }))
    .pipe(buffer())
    .pipe(sourcemaps.init({ includeContent: false, loadMaps: true }))

  const postMinifiedStream = (minify)
    ? browserifyStream.pipe(uglify())
    : browserifyStream

  return postMinifiedStream
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(destinationDirectory))
    .on('error', function (err) { log(colors.red('[Error]'), err.toString()) })
    .on('finish', callback)
}
