const path = require('path')
const picomatch = require('picomatch')

// Turns one watch rule's glob patterns into something chokidar 4 can act on.
//
// NB chokidar 4 removed glob support (it was chokidar 3's glob-parent/braces path), so a pattern
// containing ** is treated as a literal path of that name and matches nothing. gulp.watch accepted
// globs directly, so the rules have to be split: watch the static prefix DIRECTORY, then apply the
// pattern to each event. picomatch.scan().base yields the same non-magic prefix gulp.src used as its
// base, and picomatch is already in the tree as fast-glob's matcher.
const compileWatchRule = ({ basePath, patterns }) => {
  const bases = patterns.map(pattern => picomatch.scan(pattern).base || '.')
  const directories = [...new Set(bases)].map(base => path.join(basePath, base))

  const isMatch = picomatch(patterns)

  // chokidar reports absolute, platform-native paths; picomatch wants posix relative to basePath.
  const matches = (changedPath) => isMatch(
    path.relative(basePath, changedPath).split(path.sep).join('/')
  )

  return { directories, matches }
}

module.exports = compileWatchRule
