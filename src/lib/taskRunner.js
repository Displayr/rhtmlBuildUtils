const fs = require('fs')
const path = require('path')
const colors = require('ansi-colors')

// Replaces gulp's task registry and gulp.series/gulp.parallel.
//
// The sequence format is unchanged from the gulp era, so taskSequences in src/index.js reads exactly
// as it did -- and so does its BEHAVIOUR: every step runs sequentially, nesting included.
//
// NB the nesting looks like parallelism and is not. gulp.task(name, gulp.series(...taskSequences[name]))
// reached undertaker's normalizeArgs, which flattens its arguments with arr-flatten before handing them
// to bach.series, so a nested array was flattened into the surrounding series. Running them
// concurrently instead would start openBrowser before connect had bound the port, and let less (in
// core) race prepareInternalWwwCss (in compileInternal) for browser/styles/index.css -- which is pixel
// relevant. Introducing parallelism is a deliberate change to make on its own, not a side effect of
// dropping gulp.
//
// A task module is `() => function (done) { ... }`: the factory is called once, and the function it
// returns takes a node style callback. That is the same contract the tasks had under gulp, minus the
// `gulp` argument that was passed to every factory and used by only a handful of them.

const TASK_DIRECTORIES = ['tasks/misc', 'tasks/webserver', 'tasks/snapshot', 'tasks/experiment']

// 'assets' holds files copied into widget repos (jest runners, browser UI), not tasks.
const NOT_TASK_ENTRIES = ['assets']

const stripJsSuffix = file => file.replace(/\.js$/, '')

const discoverTaskModulePaths = () => {
  const found = {}
  TASK_DIRECTORIES.forEach(relativeDirectory => {
    const directory = path.join(__dirname, '..', relativeDirectory)
    fs.readdirSync(directory)
      .map(stripJsSuffix)
      .filter(name => !NOT_TASK_ENTRIES.includes(name))
      .forEach(name => { found[name] = path.join(directory, name) })
  })
  return found
}

const promisifyTask = (taskName, taskFunction) => new Promise((resolve, reject) => {
  let settled = false
  const done = (error) => {
    // NB some tasks call done() from a stream/child-process callback that can fire more than once.
    // Under gulp a second call raised "task function called too many times"; here it is ignored, so a
    // sloppy task cannot reject a sequence that already succeeded.
    if (settled) { return }
    settled = true
    if (error) { reject(error) } else { resolve() }
  }

  try {
    const returned = taskFunction(done)
    // A task may return a promise instead of (or as well as) calling done.
    if (returned && typeof returned.then === 'function') {
      returned.then(() => done(), done)
    }
  } catch (error) {
    done(error)
  }
})

// Resolving a task name to its function is injectable so that runSequence can be tested without
// executing real build tasks; nothing in production passes it.
const createRunner = ({ taskSequences, disabledTasks = [], loadTask }) => {
  const taskModulePaths = discoverTaskModulePaths()

  // Required lazily rather than up front so that a broken or irrelevant task module cannot stop an
  // unrelated task from running, and so widgetConfig is only read by tasks that need it.
  const loadTaskFunction = loadTask || (taskName => {
    const modulePath = taskModulePaths[taskName]
    return modulePath ? require(modulePath)() : undefined
  })

  const runNamed = async (taskName) => {
    if (disabledTasks.includes(taskName)) {
      console.log(colors.yellow(`skipping '${taskName}'`))
      return
    }

    if (taskSequences[taskName]) {
      return runSequence(taskSequences[taskName])
    }

    const taskFunction = loadTaskFunction(taskName)
    if (!taskFunction) {
      // NB the list of valid names is printed by the CLI, not appended here, so that a programmatic
      // caller gets a one line message rather than all 34 task names.
      throw new Error(`unknown task '${taskName}'`)
    }

    const started = Date.now()
    console.log(`starting '${taskName}'`)
    await promisifyTask(taskName, taskFunction)
    console.log(`finished '${taskName}' after ${Date.now() - started} ms`)
  }

  // flat() reproduces arr-flatten, which is what undertaker did to these same arrays.
  const runSequence = async (sequence) => {
    for (const step of sequence.flat(Infinity)) {
      await runNamed(step)
    }
  }

  const knownTaskNames = () => [
    ...Object.keys(taskSequences),
    ...Object.keys(taskModulePaths)
  ].sort()

  return { runNamed, runSequence, knownTaskNames }
}

module.exports = { createRunner, promisifyTask, discoverTaskModulePaths }
