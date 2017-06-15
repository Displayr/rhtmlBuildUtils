const path = require('path')
const browserify = require('browserify')
const babelify = require('babelify')
const gutil = require('gulp-util')
const tap = require('gulp-tap')
const buffer = require('gulp-buffer')
const sourcemaps = require('gulp-sourcemaps')

const widgetConfig = require('../lib/widgetConfig')

module.exports = function (gulp) {
  return function () {
    const entryPoint = path.join(widgetConfig.basePath, 'theSrc/internal_www/js/renderIndexPage.js')
    const dest = path.join(widgetConfig.basePath, 'browser/js/')

    return gulp.src(entryPoint, { read: false })
      .pipe(tap(function (file) {
        gutil.log(`bundling ${file.path}`)

        file.contents = browserify(file.path, { debug: true })
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
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(dest))
  }
}
