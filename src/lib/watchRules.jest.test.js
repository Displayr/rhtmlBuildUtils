const path = require('path')

const compileWatchRule = require('./watchRules')

const basePath = path.join(path.sep, 'widget', 'repo')
const at = (...segments) => path.join(basePath, ...segments)

// NB chokidar 4 removed glob support entirely -- it was chokidar 3's glob-parent/braces path. Handing
// it a string containing ** makes it watch a literal path of that name, which does not exist, so the
// rule fires nothing. Verified against chokidar 4.0.3: a glob watcher saw no event for a matching new
// file, while a directory watcher saw it. So the directory is watched and the pattern is applied here.
describe('directories', () => {
  test('watches the static prefix of the pattern, not the pattern', () => {
    const { directories } = compileWatchRule({ basePath, patterns: ['theSrc/styles/**/*.less'] })

    expect(directories).toEqual([at('theSrc', 'styles')])
  })

  test('dedupes patterns that share a prefix', () => {
    const { directories } = compileWatchRule({
      basePath,
      patterns: ['theSrc/scripts/*.js', 'theSrc/scripts/**/*.js']
    })

    expect(directories).toEqual([at('theSrc', 'scripts')])
  })

  test('keeps distinct prefixes', () => {
    const { directories } = compileWatchRule({
      basePath,
      patterns: ['theSrc/internal_www/js/*.js', 'theSrc/scripts/**/*.js']
    })

    expect(directories).toEqual([at('theSrc', 'internal_www', 'js'), at('theSrc', 'scripts')])
  })
})

describe('matches', () => {
  const { matches } = compileWatchRule({ basePath, patterns: ['theSrc/styles/**/*.less'] })

  test('accepts a file the pattern covers', () => {
    expect(matches(at('theSrc', 'styles', 'main.less'))).toBe(true)
  })

  test('accepts a file in a nested directory', () => {
    expect(matches(at('theSrc', 'styles', 'partials', 'colors.less'))).toBe(true)
  })

  // The whole point of matching here: the watcher is on the directory, so it sees every file in it.
  test('rejects a file in the watched directory that the pattern does not cover', () => {
    expect(matches(at('theSrc', 'styles', 'main.css'))).toBe(false)
  })

  test('rejects a file outside the watched tree', () => {
    expect(matches(at('theSrc', 'scripts', 'main.less'))).toBe(false)
  })
})

// Carried over verbatim from the gulp version, typo included: `**/.css` matches a file literally named
// ".css", not "*.css". Left as it was because this PR reproduces the gulp behaviour rather than
// changing it, and the rule is redundant anyway -- theSrc/internal_www/**/* already rebuilds via copy.
test('the internal_www styles rule matches nothing, exactly as it did under gulp', () => {
  const { matches } = compileWatchRule({ basePath, patterns: ['theSrc/internal_www/styles/**/.css'] })

  expect(matches(at('theSrc', 'internal_www', 'styles', 'main.css'))).toBe(false)
  expect(matches(at('theSrc', 'internal_www', 'styles', '.css'))).toBe(true)
})
