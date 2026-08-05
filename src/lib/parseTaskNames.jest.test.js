const parseTaskNames = require('./parseTaskNames')

test('a single task', () => {
  expect(parseTaskNames(['build'])).toEqual(['build'])
})

test('several tasks run in sequence', () => {
  expect(parseTaskNames(['core', 'compileInternal'])).toEqual(['core', 'compileInternal'])
})

test('no arguments yields no tasks, so the caller can fall back to default', () => {
  expect(parseTaskNames([])).toEqual([])
})

test('an --opt=value flag is not a task', () => {
  expect(parseTaskNames(['testVisual', '--env=local', '--branch=master'])).toEqual(['testVisual'])
})

// These are the regression. A space-separated flag value is a bare word, so filtering on "does not start
// with -" read it as a task name and failed with "unknown task 'HEAD'". Both forms below are used in
// anger: reviewBaselines takes `--from <ref>`, and rhtmlCombinedScatter's CI runs `-t "$TEST_FILTER"`.
test('a space separated --flag value is not a task', () => {
  expect(parseTaskNames(['reviewBaselines', '--from', 'HEAD'])).toEqual(['reviewBaselines'])
})

test('a space separated short flag value is not a task', () => {
  expect(parseTaskNames(['testVisual', '-t', 'someFilter'])).toEqual(['testVisual'])
})

test('several flag values after several tasks', () => {
  expect(parseTaskNames(['reviewBaselines', '--from', 'abc123^', '--to', 'abc123']))
    .toEqual(['reviewBaselines'])
})

test('a boolean short flag with no value', () => {
  expect(parseTaskNames(['testVisual_s', '-u'])).toEqual(['testVisual_s'])
})

// Flags before tasks are not supported: everything from the first flag on is flag territory, so the task
// name would be swallowed. Documented rather than fixed, because supporting it needs a per-flag arity
// table, which is exactly the re-declaration of every task's flags that the CLI avoids.
test('flags placed BEFORE the task names swallow them', () => {
  expect(parseTaskNames(['--port', '9001', 'serve'])).toEqual([])
})
