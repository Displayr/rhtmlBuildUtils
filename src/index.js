const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const opn = require('opn')
const cliArgs = require('yargs').argv

module.exports = {
  registerGulpTasks: registerGulpTasks
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
      runSequence('clean', ['core', 'lint'], ['makeDocs', 'testSpecs'], done)
    })
  }

  if (shouldRegister('core')) {
    gulp.task('core', ['compileES6', 'less', 'copy', 'buildContentManifest'])
  }

  if (shouldRegister('serve')) {
    const port = cliArgs.port || 9000

    const buildTasks = [
      'core',
      'compileRenderExamplePage',
      'compileRenderContentPage',
      'compileRenderIndexPage',
      'buildSnapshotsFeatureFile',
      'connect',
      'watch'
    ]

    const openBrowser = function () {
      opn(`http://localhost:${port}`)
    }

    gulp.task('serve', buildTasks, openBrowser)
  }

  if (shouldRegister('testVisual')) {
    gulp.task('testVisual', function (done) {
      runSequence(
        ['less', 'copy', 'webdriverUpdate', 'compileRenderContentPage', 'buildSnapshotsFeatureFile'],
        'connect',
        'runProtractor',
        done
      )
    })

    gulp.task('testVisual_s', ['runProtractor'])
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
}

function onlyDotJsFiles (file) {
  return (/\.js$/i).test(file)
}

function stripJsSuffix (file) {
  return file.replace(/\.js$/, '')
}
