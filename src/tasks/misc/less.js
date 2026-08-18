const fs = require('fs-extra')
const path = require('path')
const less = require('less')
const fastGlob = require('fast-glob')
const { formatLessError } = require('../../lib/formatError')
const { basePath } = require('../../lib/widgetConfig')

// NB PIXEL RELEVANT. The compiled css is loaded by the page the visual regression suite screenshots,
// so a change in less output moves every baseline. gulp-less@4.0.1 resolved less@3.13.1, and
// package.json pins less to exactly 3.13.1 for that reason -- gulp-less@5 would have allowed less@4,
// whose output can differ. Upgrading less is a separate decision that has to be batched with a
// baseline regeneration.
//
// NB the two destinations are unchanged from the gulp version, including the singular/plural split the
// rest of the build depends on: COMPILED css goes to browser/styles (PLURAL, which is what
// renderExample.html loads and what prepareInternalWwwCss also writes into), while copy.js puts
// HAND-WRITTEN css in browser/style (SINGULAR). Do not "tidy" these into one directory.
const DESTINATIONS = ['browser/styles', 'inst/htmlwidgets/lib/style']

module.exports = () => {
  return async function () {
    const lessFiles = await fastGlob('theSrc/styles/**/*.less', { cwd: basePath })

    for (const relativeFile of lessFiles) {
      const sourceFile = path.join(basePath, relativeFile)
      const source = await fs.readFile(sourceFile, 'utf8')

      // NB `filename` is what lets @import resolve relative to the file being compiled, which is how
      // gulp-less behaved. Without it any widget using @import would fail to find its partials.
      // NB the error is reformatted rather than propagated as is. less attaches filename, line and a
      // source extract, all of which gulp-less used to surface and all of which are lost if only
      // .message reaches the cli -- a broken stylesheet would report just "Unrecognised input".
      let css
      try {
        ({ css } = await less.render(source, { filename: sourceFile }))
      } catch (error) {
        throw new Error(formatLessError(error, { basePath }), { cause: error })
      }

      // gulp.dest preserved the path relative to the glob base (theSrc/styles), so a nested
      // theSrc/styles/a/b.less landed at browser/styles/a/b.css. Preserved here.
      const outputName = path.basename(relativeFile).replace(/\.less$/, '.css')
      const subDirectory = path.relative(path.posix.join('theSrc', 'styles'), path.dirname(relativeFile))

      await Promise.all(DESTINATIONS.map(async (destination) => {
        const outputDirectory = path.join(basePath, destination, subDirectory)
        await fs.mkdirs(outputDirectory)
        await fs.writeFile(path.join(outputDirectory, outputName), css, 'utf8')
      }))
    }
  }
}
