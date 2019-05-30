const fs = require('fs-extra')
const path = require('path')
const opn = require('opn')
const cliArgs = require('yargs').argv

const taskSequences = {
  build: [ 'clean', ['compileES6', 'core', 'lint'], ['makeDocs', 'testSpecs'] ],
  core: [ 'less', 'copy' ],
  serve: [ ['core', 'compileInternal', 'connect', 'watch'], 'openBrowser' ],
  testVisual: [ 'core', 'compileInternal', 'connect', 'runProtractor' ],
  testVisual_s: [ 'runProtractor' ],
  compileInternal: [ 'buildContentManifest', 'prepareInternalWwwCss', 'prepareRenderExamplePage', 'compileRenderContentPage', 'compileRenderIndexPage', 'buildSnapshotsFeatureFile', 'processTestPlans' ]
}

function registerGulpTasks ({ gulp, exclusions = [] }) {
  const runSequence = require('run-sequence').use(gulp)
  const shouldRegister = function (taskName) {
    return !exclusions.includes(taskName)
  }

  if (shouldRegister('default')) {
    gulp.task('default', function () {
      gulp.start('build')
    })
  }

  if (shouldRegister('build')) {
    gulp.task('build', function (done) {
      runSequence(...taskSequences.build, done)
    })
  }

  if (shouldRegister('openBrowser')) {
    const port = cliArgs.port || 9000
    const openBrowser = function () {
      opn(`http://localhost:${port}`)
    }
    gulp.task('openBrowser', openBrowser)
  }

  if (shouldRegister('serve')) {
    gulp.task('serve', function (done) {
      runSequence(...taskSequences.serve, done)
    })
  }

  if (shouldRegister('testVisual')) {
    gulp.task('testVisual', function (done) {
      runSequence(...taskSequences.testVisual, done)
    })
  }

  if (shouldRegister('testVisual_s')) {
    gulp.task('testVisual_s', function (done) {
      runSequence(...taskSequences.testVisual_s, done)
    })
  }

  if (shouldRegister('core')) {
    gulp.task('core', function (done) {
      runSequence(...taskSequences.core, done)
    })
  }

  if (shouldRegister('compileInternal')) {
    gulp.task('compileInternal', function (done) {
      runSequence(...taskSequences.compileInternal, done)
    })
  }

  const pathToTaskFiles = path.join(__dirname, 'build', 'tasks')
  fs.readdirSync(pathToTaskFiles)
    .filter(onlyDotJsFiles)
    .map(stripJsSuffix)
    .map(function (taskName) {
      if (shouldRegister(taskName)) {
        const modulePath = path.join(pathToTaskFiles, taskName)
        gulp.task(taskName, require(modulePath)(gulp))
      }
    })

  return runSequence
}

function onlyDotJsFiles (file) {
  return (/\.js$/i).test(file)
}

function stripJsSuffix (file) {
  return file.replace(/\.js$/, '')
}

module.exports = {
  registerGulpTasks,
  taskSequences
}
