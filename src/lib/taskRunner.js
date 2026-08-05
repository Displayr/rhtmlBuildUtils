const fs = require('fs')
const path = require('path')
const colors = require('ansi-colors')

// Replaces gulp's task registry and gulp.series/gulp.parallel.
//
// The sequence format is unchanged from the gulp era, so taskSequences in src/index.js reads exactly
// as it did: a flat entry runs on its own, and a NESTED ARRAY runs its members concurrently. That
// mirrors gulp.series([...]) with a gulp.parallel(...) inside it.
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

const createRunner = ({ taskSequences, disabledTasks = [] }) => {
  const taskModulePaths = discoverTaskModulePaths()

  const runNamed = async (taskName) => {
    if (disabledTasks.includes(taskName)) {
      console.log(colors.yellow(`skipping '${taskName}'`))
      return
    }

    if (taskSequences[taskName]) {
      return runSequence(taskSequences[taskName])
    }

    const modulePath = taskModulePaths[taskName]
    if (!modulePath) {
      // NB the list of valid names is printed by the CLI, not appended here, so that a programmatic
      // caller gets a one line message rather than all 34 task names.
      throw new Error(`unknown task '${taskName}'`)
    }

    const started = Date.now()
    console.log(`starting '${taskName}'`)
    // Required here rather than up front so that a broken or irrelevant task module cannot stop an
    // unrelated task from running, and so widgetConfig is only read by tasks that need it.
    const taskFunction = require(modulePath)()
    await promisifyTask(taskName, taskFunction)
    console.log(`finished '${taskName}' after ${Date.now() - started} ms`)
  }

  const runSequence = async (sequence) => {
    for (const step of sequence) {
      if (Array.isArray(step)) {
        await Promise.all(step.map(runNamed))
      } else {
        await runNamed(step)
      }
    }
  }

  const knownTaskNames = () => [
    ...Object.keys(taskSequences),
    ...Object.keys(taskModulePaths)
  ].sort()

  return { runNamed, runSequence, knownTaskNames }
}

module.exports = { createRunner, promisifyTask, discoverTaskModulePaths }
