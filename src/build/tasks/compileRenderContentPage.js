const _ = require('lodash')
const babelify = require('babelify')
const browserify = require('browserify')
const log = require('fancy-log')
const colors = require('ansi-colors')
const buffer = require('gulp-buffer')
const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')
const sourcemaps = require('gulp-sourcemaps')
const tap = require('gulp-tap')

const { basePath, widgetFactory, internalWebSettings } = require('../lib/widgetConfig')

const templateVariables = _.merge(
  {},
  internalWebSettings,
  { widget_definition_path: path.join('..', widgetFactory) }
)

module.exports = function (gulp) {
  return function (done) {
    // step 1: apply vars to template, and save renderContentPage in .tmp
    const templateFile = path.join(__dirname, '../templates/renderContentPage.template.js')
    const entryPointDirectory = path.join(basePath, '.tmp')
    const entryPoint = path.join(basePath, '.tmp/renderContentPage.js')
    const compiledContentDestination = path.join(basePath, 'browser/js/')

    fs.mkdirsSync(entryPointDirectory)
    fs.mkdirsSync(compiledContentDestination)

    const templateContent = fs.readFileSync(templateFile, 'utf8')
    const output = mustache.render(templateContent, templateVariables)
    fs.writeFileSync(entryPoint, output, 'utf8')

    // step 2: browserify renderContentPage.js, which bundles all the widget code into single file for browser testing
    return gulp.src(entryPoint, { read: false })
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
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(compiledContentDestination))
      .on('error', function (err) { log(colors.red('[Error]'), err.toString()) })
      .on('finish', done)
  }
}
