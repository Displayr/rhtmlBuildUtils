const colors = require('ansi-colors')
const { runTasks, knownTaskNames, widgetConfig } = require('./index')
const { runTeardowns } = require('./lib/teardown')
const resolveTaskNames = require('./lib/resolveTaskNames')
const { formatTaskError } = require('./lib/formatError')

// Entry point for the `rhtml` binary. Replaces `gulp <task> [<task>...] [--flags]` with
// `rhtml <task> [<task>...] [--flags]`.
//
// NB the flags themselves are deliberately NOT parsed here. Each task declares and reads its own flags
// out of process.argv via yargs (--fix, --env, --branch, --port, --from, -t, -u, ...). Routing them
// through a yargs command definition here would mean re-declaring every flag of every task, and the
// task-local declarations are what the docs describe.
//
// Which arguments are task names is decided by src/lib/parseTaskNames.js, and the fallback to
// `default` by src/lib/resolveTaskNames.js.
const main = async () => {
  const taskNames = resolveTaskNames(process.argv.slice(2))

  const disabledTasks = widgetConfig.disabledTasks || []

  await runTasks({ taskNames, disabledTasks })
}

// NB an interrupted run still has to release what it registered. The visual suite writes a
// pass-through config file that widgetConfig merges ABOVE the widget's own config, so a Ctrl-C
// during a long snapshot run would otherwise leave every later task reconfigured. Teardowns are
// idempotent, so running them here and in the normal path is safe.
const interrupted = async (signal) => {
  console.error(`\nreceived ${signal}, cleaning up`)
  await runTeardowns()
  process.exit(130)
}

process.on('SIGINT', () => interrupted('SIGINT'))
process.on('SIGTERM', () => interrupted('SIGTERM'))

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
