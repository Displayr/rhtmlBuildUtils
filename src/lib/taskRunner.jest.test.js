const { promisifyTask, discoverTaskModulePaths } = require('./taskRunner')

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
