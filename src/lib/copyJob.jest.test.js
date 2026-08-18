const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const copyJob = require('./copyJob')

let basePath

beforeEach(() => {
  basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'copyjob-'))
  fs.outputFileSync(path.join(basePath, 'theSrc/R/htmlwidget.R'), 'widget <- function () {}')
  fs.outputFileSync(path.join(basePath, 'theSrc/R/helper.R'), 'helper <- function () {}')
  fs.outputFileSync(path.join(basePath, 'theSrc/styles/a.css'), 'a{}')
})

afterEach(() => fs.removeSync(basePath))

const read = (...segments) => fs.readFileSync(path.join(basePath, ...segments), 'utf8')
const exists = (...segments) => fs.existsSync(path.join(basePath, ...segments))

// NB gulp.src defaults allowEmpty to false and threw "File not found with singular glob" when a
// non-magic single path was missing. fast-glob just returns [], so without this guard a widget repo
// with no theSrc/R/htmlwidget.yaml reports a successful build and ships an R package with no
// inst/htmlwidgets/<widget>.yaml -- broken at load time in R rather than at build time.
describe('mustMatch', () => {
  test('throws, naming the path, when a required source is missing', async () => {
    await expect(copyJob({
      basePath,
      from: 'theSrc/R/htmlwidget.yaml',
      base: 'theSrc/R',
      to: ['inst/htmlwidgets'],
      mustMatch: true
    })).rejects.toThrow('theSrc/R/htmlwidget.yaml')
  })

  test('does not throw when the required source is present', async () => {
    await expect(copyJob({
      basePath,
      from: 'theSrc/R/htmlwidget.R',
      base: 'theSrc/R',
      to: ['R'],
      mustMatch: true
    })).resolves.toBeUndefined()
  })

  // The glob jobs, and moveCrossExperimentSnapshotComparisonListToBrowser, deliberately tolerate an
  // empty match -- that was gulp's allowEmpty: true.
  test('tolerates an empty match when mustMatch is not set', async () => {
    await expect(copyJob({
      basePath,
      from: 'theSrc/images/**/*',
      base: 'theSrc/images',
      to: ['browser/images']
    })).resolves.toBeUndefined()
  })
})

describe('transcription of the gulp pipelines', () => {
  test('renames to a single destination', async () => {
    await copyJob({ basePath, from: 'theSrc/R/htmlwidget.R', base: 'theSrc/R', to: ['R'], renameTo: 'myWidget.R' })

    expect(read('R', 'myWidget.R')).toBe('widget <- function () {}')
  })

  test('writes every destination in the list', async () => {
    await copyJob({ basePath, from: 'theSrc/styles/**/*.css', base: 'theSrc/styles', to: ['inst/htmlwidgets/lib/style', 'browser/style'] })

    expect(read('inst/htmlwidgets/lib/style', 'a.css')).toBe('a{}')
    expect(read('browser/style', 'a.css')).toBe('a{}')
  })

  test('a null base flattens into the destination', async () => {
    await copyJob({ basePath, from: ['theSrc/R/helper.R'], base: null, to: ['browser/external'] })

    expect(exists('browser/external', 'helper.R')).toBe(true)
  })

  test('honours a negated pattern', async () => {
    await copyJob({ basePath, from: ['theSrc/R/*.R', '!theSrc/R/htmlwidget.R'], base: 'theSrc/R', to: ['R'] })

    expect(exists('R', 'helper.R')).toBe(true)
    expect(exists('R', 'htmlwidget.R')).toBe(false)
  })
})
