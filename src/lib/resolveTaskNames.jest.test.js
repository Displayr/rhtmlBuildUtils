const resolveTaskNames = require('./resolveTaskNames')

test('runs the requested tasks', () => {
  expect(resolveTaskNames(['core', 'compileInternal'])).toEqual(['core', 'compileInternal'])
})

test('falls back to default when there are no arguments at all', () => {
  expect(resolveTaskNames([])).toEqual(['default'])
})

test('keeps the task when flags follow it', () => {
  expect(resolveTaskNames(['testVisual', '--env=local'])).toEqual(['testVisual'])
})

// NB the fallback must NOT absorb these. parseTaskNames stops at the first flag, so each of these
// yields no task names -- and falling back to `default` runs `build`, whose first step is `clean`,
// deleting browser/, inst/, R/ and .tmp/. In a widget repo inst/ and R/ are committed, so typing the
// flag first would silently destroy tracked files and rebuild, with nothing saying the requested task
// had been dropped.
describe('arguments that contain no task name', () => {
  test.each([
    [['--fix', 'lint']],
    [['-u', 'testVisual_s']],
    [['--port', '9001', 'serve']]
  ])('refuses %j rather than silently running the default build', (argv) => {
    expect(() => resolveTaskNames(argv)).toThrow('no task name before the first flag')
  })

  test('echoes the invocation so the mistake is visible', () => {
    expect(() => resolveTaskNames(['--fix', 'lint'])).toThrow('rhtml --fix lint')
  })
})
