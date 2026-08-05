const colors = require('ansi-colors')
const { runTasks, knownTaskNames } = require('./index')
const { runTeardowns } = require('./lib/teardown')

// Entry point for the `rhtml` binary. Replaces `gulp <task> [<task>...] [--flags]` with
// `rhtml <task> [<task>...] [--flags]`.
//
// NB task names are taken as the positional arguments and flags are left alone, because the tasks
// parse their own flags out of process.argv via yargs (--fix, --env, --branch, --port, -t, -u, ...).
// Deliberately not routed through a yargs command definition here: that would have to re-declare
// every flag of every task, and the task-local declarations are what the docs describe.
const parseTaskNames = (argv) => argv.filter(arg => !arg.startsWith('-'))

const main = async () => {
  const requested = parseTaskNames(process.argv.slice(2))
  const taskNames = requested.length ? requested : ['default']

  // NB required lazily: widgetConfig reads <widget repo>/build/config/widget.config.js at require
  // time and throws if it is absent, and we want that to surface as a clear error after argv parsing
  // rather than as a stack trace before the CLI has done anything.
  const { widgetConfig } = require('./index')
  const disabledTasks = widgetConfig.disabledTasks || []

  await runTasks({ taskNames, disabledTasks })
}

main()
  .then(async () => {
    await runTeardowns()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error(colors.red(error.message))
    if (/^unknown task/.test(error.message)) {
      console.error(`\navailable tasks:\n  ${knownTaskNames().join('\n  ')}`)
    }
    await runTeardowns()
    process.exit(1)
  })
