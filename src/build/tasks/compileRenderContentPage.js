const babelify = require('babelify')
const browserify = require('browserify')
const buffer = require('gulp-buffer')
const fs = require('fs-extra')
const gutil = require('gulp-util')
const mustache = require('mustache')
const path = require('path')
const sourcemaps = require('gulp-sourcemaps')
const tap = require('gulp-tap')

const widgetConfig = require('../lib/widgetConfig')

module.exports = function (gulp) {
  return function () {
    // step 1: apply vars to template, and save renderContentPage in .tmp
    const templateFile = path.join(__dirname, '../templates/renderContentPage.js')
    const templateContent = fs.readFileSync(templateFile, 'utf8')
    const templateVariables = {
      widget_definition_path: path.join('..', widgetConfig.widgetDefinition)
    }

    const output = mustache.render(templateContent, templateVariables)
    fs.mkdirsSync('.tmp')
    fs.writeFileSync('.tmp/renderContentPage.js', output, 'utf8')

    // step 2: browserify renderContentPage.js, which bundles all the widget code into single file for browser testing
    const entryPoint = path.join(widgetConfig.basePath, '.tmp/renderContentPage.js')
    const dest = path.join(widgetConfig.basePath, 'browser/js/')

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
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(dest))
  }
}