const path = require('path')

const { formatLessError, formatTaskError } = require('./formatError')

const basePath = path.join(path.sep, 'widget', 'repo')

// NB a less error carries filename, line, column and a three line extract, and gulp-less surfaced all
// of it. Printing only .message reduces a broken stylesheet to the single word "Unrecognised input" —
// no file, no line, and no indication which of N .less files failed.
describe('formatLessError', () => {
  const lessError = () => Object.assign(new Error('Unrecognised input'), {
    type: 'Parse',
    filename: path.join(basePath, 'theSrc', 'styles', 'main.less'),
    line: 2,
    column: 17,
    extract: ['.ok { color: red; }', '.broken { color: @@; }', '.after { color: blue; }']
  })

  test('names the file, line and column', () => {
    expect(formatLessError(lessError(), { basePath })).toContain('theSrc/styles/main.less:2:17')
  })

  test('keeps the original message', () => {
    expect(formatLessError(lessError(), { basePath })).toContain('Unrecognised input')
  })

  test('shows the offending line, marked, with its neighbours', () => {
    const formatted = formatLessError(lessError(), { basePath })

    expect(formatted).toContain('  1 | .ok { color: red; }')
    expect(formatted).toContain('> 2 | .broken { color: @@; }')
    expect(formatted).toContain('  3 | .after { color: blue; }')
  })

  test('handles an error on the first line, where there is no preceding line', () => {
    const first = Object.assign(lessError(), { line: 1, extract: [undefined, '.broken { color: @@; }', '.after {}'] })

    expect(formatLessError(first, { basePath })).toContain('> 1 | .broken { color: @@; }')
    expect(formatLessError(first, { basePath })).not.toContain('undefined')
  })

  test('falls back to the absolute path when the file is outside the widget', () => {
    const outside = Object.assign(lessError(), { filename: path.join(path.sep, 'elsewhere', 'x.less') })

    expect(formatLessError(outside, { basePath })).toContain(path.join(path.sep, 'elsewhere', 'x.less'))
  })

  test('returns the plain message for an error that is not a less error', () => {
    expect(formatLessError(new Error('something else'), { basePath })).toBe('something else')
  })
})

// NB a TypeError reduced to its message ("Cannot read properties of undefined (reading 'x')") says
// nothing about where it came from. Errors we raise deliberately are already self-describing, so the
// stack is only added for the error types that always mean a bug in a task.
describe('formatTaskError', () => {
  test('reports a deliberate error as its message alone', () => {
    expect(formatTaskError(new Error('unknown task \'nope\''))).toEqual({
      summary: 'unknown task \'nope\'',
      detail: null
    })
  })

  test('adds the stack for a TypeError, which always means a bug', () => {
    const error = new TypeError('Cannot read properties of undefined')

    const { summary, detail } = formatTaskError(error)

    expect(summary).toBe('Cannot read properties of undefined')
    expect(detail).toBe(error.stack)
  })

  test.each([ReferenceError, RangeError, SyntaxError])('adds the stack for %p', (ErrorType) => {
    expect(formatTaskError(new ErrorType('boom')).detail).not.toBeNull()
  })

  test('survives a thrown value that is not an Error', () => {
    expect(formatTaskError('just a string')).toEqual({ summary: 'just a string', detail: null })
  })
})
