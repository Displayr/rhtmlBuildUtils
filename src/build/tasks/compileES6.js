const path = require('path')
const browserify = require('browserify')
const babelify = require('babelify')
const gutil = require('gulp-util')
const tap = require('gulp-tap')
const buffer = require('gulp-buffer')
const sourcemaps = require('gulp-sourcemaps')
const uglify = require('gulp-uglify')

const widgetConfig = require('../lib/widgetConfig')

module.exports = function (gulp) {
  return function () {
    const entryPoint = path.join(widgetConfig.basePath, widgetConfig.widgetEntryPoint)
    const dest = path.join(widgetConfig.basePath, 'inst/htmlwidgets/')

    return gulp.src(entryPoint, {read: false})
      .pipe(tap(function (file) {
        gutil.log(`bundling ${file.path}`)

        file.contents = browserify(file.path, {debug: true})
          .transform(babelify, {
            presets: [require('babel-preset-es2015-ie')],
            plugins: [
              require('babel-plugin-transform-object-assign'),
              require('babel-plugin-transform-exponentiation-operator'),
              require('babel-plugin-array-includes').default
            ]
          })
          .bundle()
      }))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(uglify())
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(dest))
      .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()) })
  }
}
