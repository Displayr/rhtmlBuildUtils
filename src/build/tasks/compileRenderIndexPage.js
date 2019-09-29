const babelify = require('babelify')
const browserify = require('browserify')
const buffer = require('gulp-buffer')
const fs = require('fs-extra')
const log = require('fancy-log')
const mustache = require('mustache')
const path = require('path')
const sourcemaps = require('gulp-sourcemaps')
const tap = require('gulp-tap')

const { basePath, internalWebSettings } = require('../lib/widgetConfig')

module.exports = function (gulp) {
  return function (done) {
    // step 1: apply vars to template, and save renderContentPage in .tmp
    const templateFile = path.join(__dirname, '../templates/renderIndexPage.template.js')
    const entryPointDirectory = path.join(basePath, '.tmp')
    const entryPoint = path.join(basePath, '.tmp/renderIndexPage.js')
    const compiledContentDestination = path.join(basePath, 'browser/js/')

    fs.mkdirsSync(entryPointDirectory)
    fs.mkdirsSync(compiledContentDestination)

    const templateContent = fs.readFileSync(templateFile, 'utf8')
    const output = mustache.render(templateContent, internalWebSettings)
    fs.writeFileSync(entryPoint, output, 'utf8')

    // step 2: browserify renderIndexPage.js
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
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(compiledContentDestination))
      .on('finish', done)
  }
}
