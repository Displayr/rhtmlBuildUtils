// Coalesces and serialises the rebuilds that `watch` triggers.
//
// NB gulp.watch did both of these for free. glob-watcher's defaults are delay: 200 and queue: true, so
// a burst of file events debounced into one run and a rule never ran twice concurrently. chokidar does
// not await an async listener, so without this every saved file starts its own invocation: a save-all,
// a branch checkout or a formatter pass launches several copies of the same task, which then race for
// the same output paths and fail with EPERM/ENOENT unlink errors. `watch` catches those, so the
// developer just sees a stale browser.
//
// NB the single chain is shared across ALL rules, which goes one step further than gulp: glob-watcher
// kept its running/queued state per watch() call, so two rules could still interleave. `less` and
// `copy` both write into inst/htmlwidgets/lib/style -- the race src/index.js says `core` must stay
// sequential to avoid -- and they are separate rules here, so per-rule serialisation would leave it open.
const DEFAULT_DELAY = 200

const createRebuildQueue = ({ run, delay = DEFAULT_DELAY, onError = () => {} }) => {
  const timers = new Map()
  let chain = Promise.resolve()

  const schedule = (taskName) => {
    clearTimeout(timers.get(taskName))
    timers.set(taskName, setTimeout(() => {
      timers.delete(taskName)
      chain = chain.then(async () => {
        try {
          await run(taskName)
        } catch (error) {
          // A failed rebuild must not kill the dev server, nor stop the rebuilds queued behind it.
          onError(taskName, error)
        }
      })
    }, delay))
  }

  // Test seam: settles once nothing is pending. Not used by the watch task, which never idles.
  const whenIdle = async () => {
    while (timers.size > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    await chain
  }

  return { schedule, whenIdle }
}

module.exports = createRebuildQueue
