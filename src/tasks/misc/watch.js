const path = require('path')
const chokidar = require('chokidar')
const livereload = require('livereload')
const yargs = require('yargs')
const compileWatchRule = require('../../lib/watchRules')
const { createRunner } = require('../../lib/taskRunner')
const { registerTeardown } = require('../../lib/teardown')
const { basePath, disabledTasks, snapshotTesting: { testplanDirectory } } = require('../../lib/widgetConfig')

// NB replaces gulp.watch + gulp-livereload. gulp.watch bundled chokidar@2, the source of four
// deprecation warnings and several high severity audit findings; chokidar is a direct dependency now.
// gulp-livereload wrapped tiny-lr, which pulled in a deprecated raw-body.
//
// NB this task never resolves, by design. Under gulp, `serve` ended in `watch` and the process stayed
// alive until interrupted; that is preserved.
module.exports = () => {
  return function () {
    const port = yargs.parse().port || 9000
    const liveReloadPort = 35729 + (parseInt(port) - 9000)

    // NB built here rather than at module scope so a rebuild triggered by a file change resolves tasks
    // through exactly the same path as a command line invocation. Required lazily to avoid a cycle:
    // src/index.js -> taskRunner -> this module.
    //
    // disabledTasks has to come along: src/cli.js passes it, so without it a widget repo's disabled
    // task would be skipped on the command line and then run again on every save.
    const { runNamed } = createRunner({
      taskSequences: require('../../index').taskSequences,
      disabledTasks
    })

    const liveReloadServer = livereload.createServer({ port: liveReloadPort })
    registerTeardown('livereload server', () => liveReloadServer.close())
    console.log(`live reload listening on port ${liveReloadPort}`)

    // Reload the browser when compiled output changes. This one is a plain directory, so it needs no
    // pattern matching -- and because it kept working, the dead rules below presented as "my rebuild
    // produced nothing" rather than as a broken watcher.
    const outputWatcher = chokidar.watch(path.join(basePath, 'browser'), WATCH_OPTIONS)
    outputWatcher.on('change', changedPath => liveReloadServer.refresh(changedPath))
    registerTeardown('browser output watcher', () => outputWatcher.close())

    // Same source -> task mapping as the gulp version, including both internal_www rules rebuilding
    // via `copy`.
    const rebuildRules = [
      { watch: ['theSrc/internal_www/**/*'], run: 'copy' },
      { watch: ['theSrc/internal_www/js/*.js', 'theSrc/scripts/*.js', 'theSrc/scripts/**/*.js'], run: 'compileRenderContentPage' },
      { watch: ['theSrc/internal_www/styles/**/.css'], run: 'copy' },
      { watch: ['theSrc/styles/**/*.less'], run: 'less' },
      { watch: [`${testplanDirectory}/**/*.yaml`], run: 'processTestPlans' }
    ]

    rebuildRules.forEach(({ watch, run }) => {
      // chokidar 4 dropped glob support, so the rule is split into directories to watch and a matcher
      // to apply. See src/lib/watchRules.js.
      const { directories, matches } = compileWatchRule({ basePath, patterns: watch })

      const watcher = chokidar.watch(directories, WATCH_OPTIONS)
      watcher.on('all', async (event, changedPath) => {
        if (!matches(changedPath)) { return }
        console.log(`${event} ${changedPath} -> ${run}`)
        try {
          await runNamed(run)
        } catch (error) {
          // A failed rebuild must not kill the dev server. Report it and keep watching.
          console.error(`${run} failed: ${error.message}`)
        }
      })
      registerTeardown(`watcher for ${run}`, () => watcher.close())
    })

    return new Promise(() => {})
  }
}

// ignoreInitial matches gulp.watch's default: react to changes from now on, not to files that already
// exist. Without it, starting `serve` would rebuild once per already-present watched file.
const WATCH_OPTIONS = { ignoreInitial: true }
