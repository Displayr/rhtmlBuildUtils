const fs = require('fs-extra')
const path = require('path')
const opn = require('opn')
const cliArgs = require('yargs').argv

const taskSequences = {
  build: [ 'clean', ['compileWidgetEntryPoint', 'core', 'lint'], ['makeDocs'] ],
  core: [ 'less', 'copy' ],
  serve: [ ['core', 'compileInternal', 'connect', 'openBrowser'], 'watch' ],
  testSpecs: ['jestSpecTests'],
  testVisual: [ 'core', 'compileInternal', 'connect', 'takeSnapshotsForEachTestDefinition' ],
  testVisual_s: [ 'takeSnapshotsForEachTestDefinition' ],
  compileInternal: [ 'buildContentManifest', 'prepareInternalWwwCss', 'prepareRenderExamplePage', 'compileRenderContentPage', 'compileRenderIndexPage', 'processTestPlans' ]
}

function registerGulpTasks ({ gulp, exclusions = [] }) {
  const shouldRegister = function (taskName) {
    return !exclusions.includes(taskName)
  }

  const taskDirectories = [
    path.join(__dirname, 'build', 'tasks'),
    path.join(__dirname, 'snapshot', 'tasks')
  ]
  taskDirectories.forEach(taskDirectory => conditionallyLoadTasksInDirectory({ gulp , taskDirectory, shouldRegister }))

  // move to task directory
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

  if (shouldRegister('testSpecs')) {
    gulp.task('testSpecs', gulp.series(...taskSequences.testSpecs))
  }

  if (shouldRegister('build')) {
    gulp.task('build', gulp.series(...taskSequences.build))
  }

  if (shouldRegister('default')) {
    gulp.task('default', gulp.series('build'))
  }

  return gulp
}

function conditionallyLoadTasksInDirectory ({ gulp, taskDirectory, shouldRegister }) {
  fs.readdirSync(taskDirectory)
    .filter(onlyDotJsFiles)
    .map(stripJsSuffix)
    .map(function (taskName) {
      if (shouldRegister(taskName)) {
        const modulePath = path.join(taskDirectory, taskName)
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

module.exports = {
  registerGulpTasks,
  taskSequences,
  snapshotTesting: {
    puppeteer: require('puppeteer'),
    'renderExamplePageTestHelper': require('./snapshot/lib/renderExamplePageTest.helper')
  }
}
