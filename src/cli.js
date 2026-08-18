const colors = require('ansi-colors')
const { runTasks, knownTaskNames } = require('./index')
const { runTeardowns } = require('./lib/teardown')
const { formatTaskError } = require('./lib/formatError')

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
    const { summary, detail } = formatTaskError(error)
    console.error(colors.red(summary))
    // NB the stack is printed only for the error types that always mean a bug in a task. Errors this
    // build raises deliberately already say everything they need to, and a stack under them is noise.
    if (detail) { console.error(detail) }
    if (/^unknown task/.test(error.message)) {
      console.error(`\navailable tasks:\n  ${knownTaskNames().join('\n  ')}`)
    }
    await runTeardowns()
    process.exit(1)
  })
