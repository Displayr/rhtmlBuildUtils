const path = require('path')

// Error reporting for the `rhtml` cli and the less task.
//
// NB gulp-less raised a PluginError carrying the filename, line and source extract that less attaches
// to its own errors, so a broken stylesheet named itself. Compiling with `less` directly and printing
// only `error.message` reduces that to the single word "Unrecognised input" -- no file, no line, and
// no clue which of a widget's .less files is at fault.

// less attaches: filename, line (1 based), column, and a three entry extract holding the line before,
// the offending line, and the line after. The first entry is undefined when the error is on line 1.
const isLessError = error => Boolean(error && error.filename && error.extract)

const formatLessError = (error, { basePath } = {}) => {
  if (!isLessError(error)) { return (error && error.message) || String(error) }

  const relativeFile = basePath ? path.relative(basePath, error.filename) : error.filename
  // path.relative walks up with .. when the file is outside the widget; the absolute path reads better.
  const location = relativeFile.startsWith('..') ? error.filename : relativeFile.split(path.sep).join('/')

  const firstExtractLine = error.line - 1
  const extract = error.extract
    .map((text, offset) => ({ text, lineNumber: firstExtractLine + offset }))
    .filter(({ text }) => text !== undefined)
    .map(({ text, lineNumber }) => {
      const marker = (lineNumber === error.line) ? '>' : ' '
      return `${marker} ${lineNumber} | ${text}`
    })

  return [
    error.message,
    `  ${location}:${error.line}:${error.column}`,
    '',
    ...extract
  ].join('\n')
}

// Errors this build raises on purpose ("unknown task 'x'", a formatted less failure, a missing
// htmlwidget source) are self describing, and a stack under them is noise. These four types are never
// deliberate: they mean a task has a bug, and the message alone does not say where.
const ALWAYS_A_BUG = [TypeError, ReferenceError, RangeError, SyntaxError]

const formatTaskError = (error) => {
  if (!(error instanceof Error)) { return { summary: String(error), detail: null } }

  const isBug = ALWAYS_A_BUG.some(ErrorType => error instanceof ErrorType)

  return {
    summary: error.message,
    detail: (isBug && error.stack) ? error.stack : null
  }
}

module.exports = { formatLessError, formatTaskError }
