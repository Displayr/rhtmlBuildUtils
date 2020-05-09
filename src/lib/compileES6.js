const babelify = require('babelify')
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
        .transform(babelify, {
          presets: [require('babel-preset-es2015-ie')],
          plugins: [
            require('babel-plugin-transform-exponentiation-operator'),
            require('babel-plugin-transform-object-assign'),
            require('babel-plugin-transform-object-rest-spread'),
            require('babel-plugin-array-includes').default
          ]
        })
        .bundle()
    }))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))

  const postMinifiedStream = (minify)
    ?  browserifyStream.pipe(uglify())
    : browserifyStream

  return postMinifiedStream
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(destinationDirectory))
    .on('error', function (err) { log(colors.red('[Error]'), err.toString()) })
    .on('finish', callback)
}