const fs = require('fs-extra')
const path = require('path')
const fastGlob = require('fast-glob')

// Copies a globbed tree, preserving structure below `base`.
//
// NB `base` is not optional decoration. gulp.src computed a base from the non-magic prefix of the glob
// and gulp.dest wrote each file relative to it, so `gulp.src('theSrc/test/experiments/**/*')` piped to
// `gulp.dest('browser/experiments')` produced browser/experiments/varyFont/testplan.yaml. fast-glob
// instead returns paths relative to cwd that still carry that prefix, so joining them onto the
// destination puts the whole source tree underneath it. Pass the same directory the glob starts from.
//
// A null or absent base keeps the cwd relative path, which is what a caller whose cwd is already the
// source root wants.
const copyTree = async ({ cwd, patterns, base = null, destination }) => {
  const matches = await fastGlob(patterns, { cwd })

  for (const relativeMatch of matches) {
    const relativeOutput = (base === null) ? relativeMatch : path.relative(base, relativeMatch)
    const outputPath = path.join(destination, relativeOutput)
    await fs.mkdirs(path.dirname(outputPath))
    await fs.copy(path.join(cwd, relativeMatch), outputPath)
  }
}

module.exports = copyTree
