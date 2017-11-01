const _ = require('lodash')
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

const DEFAULT_SETTINGS = {
}

const templateVariables = _.merge({}, DEFAULT_SETTINGS, widgetConfig.internalWebSettings)

module.exports = function (gulp) {
  return function () {
    // step 1: apply vars to template, and save renderContentPage in .tmp
    const templateFile = path.join(__dirname, '../templates/renderIndexPage.template.js')
    const templateContent = fs.readFileSync(templateFile, 'utf8')

    const output = mustache.render(templateContent, templateVariables)
    fs.mkdirsSync('.tmp')
    fs.writeFileSync('.tmp/renderIndexPage.js', output, 'utf8')

    // step 2: browserify renderIndexPage.js
    const entryPoint = path.join(__dirname, '.tmp/renderIndexPage.js')
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
