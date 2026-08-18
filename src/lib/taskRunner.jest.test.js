const { createRunner, promisifyTask, discoverTaskModulePaths } = require('./taskRunner')

describe('promisifyTask', () => {
  test('resolves when the task calls done with no error', async () => {
    await expect(promisifyTask('t', done => done())).resolves.toBeUndefined()
  })

  test('rejects with the error the task passes to done', async () => {
    await expect(promisifyTask('t', done => done(new Error('boom')))).rejects.toThrow('boom')
  })

  test('rejects when the task throws synchronously', async () => {
    await expect(promisifyTask('t', () => { throw new Error('sync boom') })).rejects.toThrow('sync boom')
  })

  test('resolves when the task returns a promise instead of calling done', async () => {
    await expect(promisifyTask('t', () => Promise.resolve('ignored'))).resolves.toBeUndefined()
  })

  test('rejects when a returned promise rejects', async () => {
    await expect(promisifyTask('t', () => Promise.reject(new Error('async boom')))).rejects.toThrow('async boom')
  })

  // NB under gulp a second done() raised "task function called too many times" and failed the build.
  // Several tasks call done from a stream or child-process callback that can fire twice, so a late
  // second call must not be able to reject a sequence that has already succeeded.
  test('ignores a second done call, so a late error cannot fail an already-successful task', async () => {
    await expect(promisifyTask('t', (done) => {
      done()
      done(new Error('too late'))
    })).resolves.toBeUndefined()
  })

  test('a task that both resolves its promise and calls done settles once', async () => {
    await expect(promisifyTask('t', (done) => {
      done()
      return Promise.resolve()
    })).resolves.toBeUndefined()
  })
})

describe('discoverTaskModulePaths', () => {
  const discovered = discoverTaskModulePaths()

  // The runner finds tasks by scanning the task directories, so a task added as a new file or
  // directory needs no registration. These are the names the widget npm scripts actually invoke.
  test.each([
    'clean', 'copy', 'less', 'lint', 'connect', 'watch', 'makeDocs', 'openBrowser',
    'jestSpecTests', 'compileWidgetEntryPoint', 'buildContentManifest', 'processTestPlans',
    'copySnapshotJestRunnerToProject', 'takeSnapshotsForEachTestDefinition'
  ])('discovers %s', (taskName) => {
    expect(discovered[taskName]).toBeDefined()
  })

  // 'assets' holds files copied into widget repos (jest runner templates, browser UI), not tasks.
  test('does not treat the assets directories as tasks', () => {
    expect(discovered.assets).toBeUndefined()
  })

  test('openBrowser is a real module, not registered inline as it was under gulp', () => {
    expect(typeof require(discovered.openBrowser)).toBe('function')
  })
})

describe('createRunner', () => {
  // Records start/end around a tick so that concurrent execution is distinguishable from sequential:
  // run serially the marks pair up (a:start,a:end,b:start,b:end), run concurrently they interleave.
  const recordingTasks = (order) => (taskName) => async () => {
    order.push(`${taskName}:start`)
    await new Promise(resolve => setImmediate(resolve))
    order.push(`${taskName}:end`)
  }

  // NB nested arrays did NOT run concurrently under gulp. gulp.task(name, gulp.series(...sequence))
  // reached undertaker's normalizeArgs, which flattens its arguments with arr-flatten before handing
  // them to bach.series -- strictly sequential. The nesting in taskSequences was therefore decorative,
  // and treating it as parallel would start openBrowser before connect had bound the port and let
  // `less` and prepareInternalWwwCss race for browser/styles/index.css.
  test('runs a nested array sequentially, as gulp.series did after arr-flatten', async () => {
    const order = []
    const runner = createRunner({
      taskSequences: { it: [['a', 'b'], 'c'] },
      loadTask: recordingTasks(order)
    })

    await runner.runNamed('it')

    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end'])
  })

  test('flattens nesting at any depth', async () => {
    const order = []
    const runner = createRunner({
      taskSequences: { it: [[['a', 'b']], 'c'] },
      loadTask: recordingTasks(order)
    })

    await runner.runNamed('it')

    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end'])
  })

  test('runs a referenced sequence in place, and sequentially', async () => {
    const order = []
    const runner = createRunner({
      taskSequences: { outer: ['a', 'inner'], inner: ['b', 'c'] },
      loadTask: recordingTasks(order)
    })

    await runner.runNamed('outer')

    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end'])
  })

  test('skips a disabled task but still completes the sequence containing it', async () => {
    const order = []
    const runner = createRunner({
      taskSequences: { it: ['a', 'b', 'c'] },
      disabledTasks: ['b'],
      loadTask: recordingTasks(order)
    })

    await runner.runNamed('it')

    expect(order).toEqual(['a:start', 'a:end', 'c:start', 'c:end'])
  })

  test('names the task it cannot find', async () => {
    const runner = createRunner({ taskSequences: {}, loadTask: () => undefined })

    await expect(runner.runNamed('nope')).rejects.toThrow('unknown task \'nope\'')
  })
})
