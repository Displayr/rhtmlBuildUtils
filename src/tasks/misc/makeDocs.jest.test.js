const shell = require('shelljs')

jest.mock('shelljs', () => ({ exec: jest.fn() }))
jest.mock('../../lib/widgetConfig', () => ({ basePath: '/widget/repo' }))

const makeDocs = require('./makeDocs')

const run = () => new Promise(resolve => makeDocs()(resolve))

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

test('runs Rscript against the widget root, not the process cwd', async () => {
  shell.exec.mockReturnValue({ code: 0, stderr: '' })

  await run()

  expect(shell.exec).toHaveBeenCalledWith(expect.stringContaining('document()'),
    expect.objectContaining({ cwd: '/widget/repo' }))
})

test('says nothing when the docs build succeeds', async () => {
  shell.exec.mockReturnValue({ code: 0, stderr: '' })

  await run()

  expect(console.log).not.toHaveBeenCalled()
})

// NB the case this exists for is not "R is absent" -- "skipped" explains that completely. It is R and
// devtools present but document() failing on a roxygen error: man/ is no longer deleted by clean, so
// the stale .Rd files survive and the build stays green. Without stderr there is no diagnostic at all.
test('reports the exit code and R stderr when the docs build fails', async () => {
  shell.exec.mockReturnValue({ code: 1, stderr: 'Error: @param requires a name\n' })

  await run()

  const [message] = console.log.mock.calls[0]
  expect(message).toContain('exited 1')
  expect(message).toContain('Error: @param requires a name')
})

test('stays non-fatal, because R and devtools are optional', async () => {
  shell.exec.mockReturnValue({ code: 127, stderr: 'Rscript: command not found' })

  await expect(run()).resolves.toBeNull()
})

test('does not append an empty line when there is no stderr', async () => {
  shell.exec.mockReturnValue({ code: 1, stderr: '' })

  await run()

  expect(console.log.mock.calls[0][0]).not.toMatch(/\n$/)
})
