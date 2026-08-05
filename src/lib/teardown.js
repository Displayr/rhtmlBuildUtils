// Long lived handles that must be released before the process can exit, registered by the tasks that
// create them (currently only the connect web server).
//
// NB this exists to replace a hack. Under gulp, `connect` left an listening server behind, so the
// gulp process never exited, and takeSnapshotsForEachTestDefinition worked around it with a
// `setTimeout(() => process.exit(exitCode), 200)` -- which forced testVisual to be the last task in
// any sequence, and made the exit code the responsibility of a task rather than the runner. Closing
// the handles explicitly means the runner owns the exit code and task order is free again.
const teardowns = []

const registerTeardown = (description, fn) => teardowns.push({ description, fn })

const runTeardowns = async () => {
  // Reverse order: later tasks may depend on handles opened by earlier ones.
  while (teardowns.length) {
    const { description, fn } = teardowns.pop()
    try {
      await fn()
    } catch (error) {
      // A failed teardown must not mask the exit code of the work that already ran.
      console.error(`failed to tear down ${description}: ${error.message}`)
    }
  }
}

const hasPendingTeardowns = () => teardowns.length > 0

module.exports = { registerTeardown, runTeardowns, hasPendingTeardowns }
