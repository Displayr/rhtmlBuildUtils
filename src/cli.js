const colors = require('ansi-colors')
const { runTasks, knownTaskNames, widgetConfig } = require('./index')
const { runTeardowns } = require('./lib/teardown')
const parseTaskNames = require('./lib/parseTaskNames')

// Entry point for the `rhtml` binary. Replaces `gulp <task> [<task>...] [--flags]` with
// `rhtml <task> [<task>...] [--flags]`.
//
// NB the flags themselves are deliberately NOT parsed here. Each task declares and reads its own flags
// out of process.argv via yargs (--fix, --env, --branch, --port, --from, -t, -u, ...). Routing them
// through a yargs command definition here would mean re-declaring every flag of every task, and the
// task-local declarations are what the docs describe.
//
// Which arguments are task names is decided by src/lib/parseTaskNames.js.
const main = async () => {
  const requested = parseTaskNames(process.argv.slice(2))
  const taskNames = requested.length ? requested : ['default']

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
