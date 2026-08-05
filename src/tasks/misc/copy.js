const fs = require('fs-extra')
const path = require('path')
const fastGlob = require('fast-glob')
const { basePath, widgetName } = require('../../lib/widgetConfig')

// NB PIXEL RELEVANT, in the sense that getting a destination wrong changes which css and which assets
// the screenshotted page loads. The source -> destination map below is a faithful transcription of the
// gulp.src/gulp.dest pipelines this replaced; the ORDER and the DESTINATIONS are the contract, not the
// implementation. Two traps worth naming:
//
//   * browser/style is SINGULAR here and holds hand-written css, while less.js writes COMPILED css to
//     browser/styles (PLURAL). renderExample.html loads the plural one. They are not the same
//     directory and must not be merged.
//   * The last entry reads from the WIDGET's node_modules, not this package's. That is why it resolves
//     against basePath.
//
// This also replaces a `setInterval` polling loop that counted stream 'finish' events against a
// hard-coded requiredCount of 8, with its own TODO admitting the count had to be kept in sync by hand.
const copyJobs = [
  { from: 'theSrc/internal_www/**/*', base: 'theSrc/internal_www', to: ['browser'] },
  { from: 'theSrc/images/**/*', base: 'theSrc/images', to: ['browser/images'] },
  { from: 'theSrc/styles/**/*.css', base: 'theSrc/styles', to: ['inst/htmlwidgets/lib/style', 'browser/style'] },
  { from: 'theSrc/internal_www/styles/**/*.css', base: 'theSrc/internal_www/styles', to: ['browser/style'] },
  { from: 'theSrc/R/htmlwidget.yaml', base: 'theSrc/R', to: ['inst/htmlwidgets'], renameTo: `${widgetName}.yaml` },
  { from: 'theSrc/R/htmlwidget.R', base: 'theSrc/R', to: ['R'], renameTo: `${widgetName}.R` },
  { from: ['theSrc/R/*.R', '!theSrc/R/htmlwidget.R'], base: 'theSrc/R', to: ['R'] },
  // only used directly in browser by renderExample.html
  {
    from: ['node_modules/lodash/lodash.min.js', 'node_modules/jquery/dist/jquery.min.js'],
    base: null,
    to: ['browser/internal_www/external']
  }
]

const copyJob = async ({ from, base, to, renameTo }) => {
  const matches = await fastGlob(from, { cwd: basePath, dot: false })

  for (const relativeMatch of matches) {
    // A null base flattens into the destination, which is what gulp.src did for an explicit file list
    // with no glob magic in its directory portion.
    const relativeOutput = (base === null)
      ? path.basename(relativeMatch)
      : path.relative(base, relativeMatch)

    for (const destination of to) {
      const outputPath = path.join(basePath, destination, renameTo ? path.basename(relativeOutput) : relativeOutput)
      const finalPath = renameTo ? path.join(path.dirname(outputPath), renameTo) : outputPath
      await fs.mkdirs(path.dirname(finalPath))
      await fs.copy(path.join(basePath, relativeMatch), finalPath)
    }
  }
}

module.exports = () => {
  return async function () {
    // Sequential rather than concurrent: two jobs share the inst/htmlwidgets/lib/style and
    // browser/style destinations, and the gulp version's ordering is what decided the winner.
    for (const job of copyJobs) {
      await copyJob(job)
    }
  }
}
