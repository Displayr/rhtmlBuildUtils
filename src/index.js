const fs = require('fs-extra')
const path = require('path')
const opn = require('opn')
const cliArgs = require('yargs').argv

const DEBUG = 0

const taskSequences = {
  build: [ 'clean', ['compileWidgetEntryPoint', 'core', 'lint'], ['makeDocs'] ],
  compileExperiments: [
    'buildExperimentManifest',
    'copyExperimentHtmlAndSnapshots',
    'compileExperimentJs'
  ],
  compileInternal: [
    'buildContentManifest',
    'prepareInternalWwwCss',
    'prepareRenderExamplePage',
    'compileRenderContentPage',
    'compileRenderIndexPage',
    'processTestPlans'
  ],
  core: [ 'less', 'copy' ],
  runExperiment: [ 'copyExperimentSnapshotJestRunnerToProject', 'takeExperimentSnapshots' ],
  serve: [ ['core', 'compileInternal', 'compileExperiments', 'connect', 'openBrowser'], 'watch' ],
  testSpecs: ['jestSpecTests'],
  testVisual: [ 'core', 'compileInternal', 'connect', 'copySnapshotJestRunnerToProject', 'takeSnapshotsForEachTestDefinition' ],
  testVisual_s: [ 'copySnapshotJestRunnerToProject', 'takeSnapshotsForEachTestDefinition' ]
}

function registerGulpTasks ({ gulp, exclusions = [] }) {
  const shouldRegister = function (taskName) {
    return !exclusions.includes(taskName)
  }

  const taskDirectories = [
    path.join(__dirname, 'tasks', 'misc'),
    path.join(__dirname, 'tasks', 'webserver'),
    path.join(__dirname, 'tasks', 'snapshot'),
    path.join(__dirname, 'tasks', 'experiment')
  ]
  taskDirectories.forEach(taskDirectory => conditionallyLoadTasksInDirectory({ gulp, taskDirectory, shouldRegister }))

  // move to task directory
  if (shouldRegister('openBrowser')) {
    const port = cliArgs.port || 9000
    const openBrowser = function (done) {
      opn(`http://localhost:${port}`)
      done()
    }
    gulp.task('openBrowser', gulp.series(openBrowser))
  }

  // NB order matters: a task cannot reference an undefined task
  const conditionallyRegisterTheseTasks = [
    'core',
    'build',
    'compileExperiments',
    'compileInternal',
    'serve',
    'runExperiment',
    'testVisual',
    'testVisual_s',
    'testSpecs'
  ]
  conditionallyRegisterTheseTasks.forEach(taskName => {
    if (shouldRegister(taskName)) {
      gulp.task(taskName, gulp.series(...taskSequences[taskName]))
    }
  })

  if (shouldRegister('default')) {
    gulp.task('default', gulp.series('build'))
  }

  return gulp
}

function conditionallyLoadTasksInDirectory ({ gulp, taskDirectory, shouldRegister }) {
  const excludedFilesAndDirectories = ['assets']
  fs.readdirSync(taskDirectory)
    .map(stripJsSuffix)
    .filter(fileName => !excludedFilesAndDirectories.includes(fileName))
    .map(function (taskName) {
      if (DEBUG) { console.log(`dir: ${taskDirectory} task: ${taskName}`) }
      if (shouldRegister(taskName)) {
        const modulePath = path.join(taskDirectory, taskName)
        gulp.task(taskName, require(modulePath)(gulp))
      }
    })
}

function stripJsSuffix (file) {
  return file.replace(/\.js$/, '')
}

module.exports = {
  widgetConfig: require('./lib/widgetConfig'),
  registerGulpTasks,
  taskSequences,
  lib: {
    compileES6: require('./lib/compileES6')
  },
  snapshotTesting: {
    puppeteer: require('puppeteer'),
    'renderExamplePageTestHelper': require('./lib/renderExamplePageTest.helper')
  }
}
