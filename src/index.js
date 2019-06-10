const fs = require('fs-extra')
const path = require('path')
const opn = require('opn')
const cliArgs = require('yargs').argv

const taskSequences = {
  build: [ 'clean', ['compileES6', 'core', 'lint'], ['makeDocs', 'testSpecs'] ],
  core: [ 'less', 'copy' ],
  serve: [ ['core', 'compileInternal', 'connect', 'openBrowser'], 'watch' ],
  testVisual: [ 'core', 'compileInternal', 'connect', 'runProtractor' ],
  testVisual_s: [ 'runProtractor' ],
  compileInternal: [ 'buildContentManifest', 'prepareInternalWwwCss', 'prepareRenderExamplePage', 'compileRenderContentPage', 'compileRenderIndexPage', 'buildSnapshotsFeatureFile', 'processTestPlans' ]
}

function registerGulpTasks ({ gulp, exclusions = [] }) {
  const shouldRegister = function (taskName) {
    return !exclusions.includes(taskName)
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

  if (shouldRegister('openBrowser')) {
    const port = cliArgs.port || 9000
    const openBrowser = function (done) {
      opn(`http://localhost:${port}`)
      done()
    }
    gulp.task('openBrowser', gulp.series(openBrowser))
  }

  if (shouldRegister('compileInternal')) {
    gulp.task('compileInternal', gulp.series(...taskSequences.compileInternal))
  }

  if (shouldRegister('core')) {
    gulp.task('core', gulp.series(...taskSequences.core))
  }

  if (shouldRegister('serve')) {
    gulp.task('serve', gulp.series(...taskSequences.serve))
  }

  if (shouldRegister('testVisual')) {
    gulp.task('testVisual', gulp.series(...taskSequences.testVisual))
  }

  if (shouldRegister('testVisual_s')) {
    gulp.task('testVisual_s', gulp.series(...taskSequences.testVisual_s))
  }

  if (shouldRegister('build')) {
    gulp.task('build', gulp.series(...taskSequences.build))
  }

  if (shouldRegister('default')) {
    gulp.task('default', gulp.series('build'))
  }

  return gulp
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
