const createRebuildQueue = require('./rebuildQueue')

const DELAY = 20

const recorder = ({ duration = 0 } = {}) => {
  const order = []
  const run = async (taskName) => {
    order.push(`${taskName}:start`)
    await new Promise(resolve => (duration > 0) ? setTimeout(resolve, duration) : setImmediate(resolve))
    order.push(`${taskName}:end`)
  }
  return { order, run }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// NB gulp.watch defaulted to delay: 200 and queue: true (glob-watcher's defaultOpts), which coalesced
// a burst of file events into one run and guaranteed a rule never ran twice at once. Neither survived
// the port to chokidar: chokidar does not await an async listener, so every event started its own
// independent invocation.
describe('debounce', () => {
  test('collapses a burst of events for one task into a single run', async () => {
    const { order, run } = recorder()
    const queue = createRebuildQueue({ run, delay: DELAY })

    queue.schedule('copy')
    queue.schedule('copy')
    queue.schedule('copy')
    await queue.whenIdle()

    expect(order).toEqual(['copy:start', 'copy:end'])
  })

  test('runs again for an event that arrives after the previous run', async () => {
    const { order, run } = recorder()
    const queue = createRebuildQueue({ run, delay: DELAY })

    queue.schedule('copy')
    await queue.whenIdle()
    queue.schedule('copy')
    await queue.whenIdle()

    expect(order).toEqual(['copy:start', 'copy:end', 'copy:start', 'copy:end'])
  })
})

// NB this goes one step beyond gulp deliberately. glob-watcher kept `running`/`queued` as locals per
// watch() call, so it serialised WITHIN a rule but not across them -- two rules could still interleave.
// That matters here because `less` and `copy` both write into inst/htmlwidgets/lib/style, which is the
// very race src/index.js says `core` must stay sequential to avoid. One chain for all rules costs
// nothing and closes it.
describe('serialisation', () => {
  test('never overlaps two runs of different tasks', async () => {
    const { order, run } = recorder()
    const queue = createRebuildQueue({ run, delay: DELAY })

    queue.schedule('less')
    queue.schedule('copy')
    await queue.whenIdle()

    expect(order).toEqual(['less:start', 'less:end', 'copy:start', 'copy:end'])
  })

  test('a run scheduled while another is in flight waits for it', async () => {
    // The task has to outlast the sleep, so that copy is scheduled while less is GENUINELY still
    // running. With an instant task the run finishes first and the test passes without serialisation.
    const { order, run } = recorder({ duration: DELAY * 3 })
    const queue = createRebuildQueue({ run, delay: DELAY })

    queue.schedule('less')
    await sleep(DELAY + 5)
    expect(order).toEqual(['less:start'])

    queue.schedule('copy')
    await queue.whenIdle()

    expect(order).toEqual(['less:start', 'less:end', 'copy:start', 'copy:end'])
  })
})

describe('failures', () => {
  test('reports a failed rebuild without breaking the chain', async () => {
    const order = []
    const onError = jest.fn()
    const run = async (taskName) => {
      order.push(taskName)
      if (taskName === 'less') { throw new Error('less exploded') }
    }
    const queue = createRebuildQueue({ run, delay: DELAY, onError })

    queue.schedule('less')
    await queue.whenIdle()
    queue.schedule('copy')
    await queue.whenIdle()

    expect(order).toEqual(['less', 'copy'])
    expect(onError).toHaveBeenCalledWith('less', expect.objectContaining({ message: 'less exploded' }))
  })
})
