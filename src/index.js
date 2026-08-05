const { createRunner } = require('./lib/taskRunner')

// NB the nesting is meaningful and unchanged from the gulp era: a flat entry runs on its own, and a
// NESTED ARRAY runs its members concurrently -- the equivalent of a gulp.parallel(...) inside a
// gulp.series(...). See src/lib/taskRunner.js.
//
// NB `core` is series, not parallel, and must stay that way: `less` and `copy` both write into
// inst/htmlwidgets/lib/style, so running them concurrently would race for any widget that ships both
// a .less and a .css with the same basename.
const taskSequences = {
  build: ['clean', ['compileWidgetEntryPoint', 'core', 'lint'], ['makeDocs']],
  compileExperiments: [
    'moveCrossExperimentSnapshotComparisonListToBrowser',
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
  core: ['less', 'copy'],
  runExperiment: ['copyExperimentSnapshotJestRunnerToProject', 'takeExperimentSnapshots'],
  serve: [['core', 'compileInternal', 'compileExperiments', 'connect', 'openBrowser'], 'watch'],
  testSpecs: ['jestSpecTests'],
  testVisual: ['core', 'compileInternal', 'connect', 'copySnapshotJestRunnerToProject', 'takeSnapshotsForEachTestDefinition'],
  testVisual_s: ['copySnapshotJestRunnerToProject', 'takeSnapshotsForEachTestDefinition'],
  default: ['build']
}

// Runs one or more of the tasks or sequences above. This is what the `rhtml` CLI (bin/rhtml.js) calls,
// and the CLI is what widget repos invoke from their npm scripts in place of `gulp <task>`.
//
// `disabledTasks` replaces both mechanisms widget repos used under gulp: the `exclusions` argument to
// registerGulpTasks, and re-registering a task as a no-op that logs "skipping". A disabled task logs
// and resolves, so a composite sequence containing it still completes.
const runTasks = async ({ taskNames, disabledTasks = [] }) => {
  const runner = createRunner({ taskSequences, disabledTasks })
  await runner.runSequence(taskNames)
}

const knownTaskNames = () => createRunner({ taskSequences }).knownTaskNames()

module.exports = {
  widgetConfig: require('./lib/widgetConfig'),
  runTasks,
  knownTaskNames,
  taskSequences,
  lib: {
    compileES6: require('./lib/compileES6')
  },
  // NB consumed by the jest runners copied into widget repos (src/tasks/*/assets/*.jest.test.js).
  // Their require('rhtmlBuildUtils') destructures exactly these names, so this shape is load bearing
  // and must not be renamed without updating those templates.
  snapshotTesting: {
    puppeteer: require('puppeteer'),
    renderExamplePageTestHelper: require('./lib/renderExamplePageTest.helper'),
    interactions: require('./lib/interactions')
  }
}
