const fs = require('fs-extra')
const path = require('path')
const fastGlob = require('fast-glob')

// One source -> destination(s) copy, replacing a gulp.src(...).pipe(gulp.dest(...)) pipeline.
//
// NB `mustMatch` restores a guard that came free with gulp. gulp.src defaults allowEmpty to false, so
// a non-magic single path that did not exist threw "File not found with singular glob" and failed the
// build. fast-glob returns [] instead, which would turn a missing htmlwidget.yaml or htmlwidget.R into
// a silently successful build that ships an R package missing its widget definition -- a failure that
// then surfaces in R at load time. Jobs that deliberately tolerate an empty match (the glob jobs, and
// moveCrossExperimentSnapshotComparisonListToBrowser, which was explicitly allowEmpty: true) simply
// leave it unset.
const copyJob = async ({ basePath, from, base, to, renameTo, mustMatch = false }) => {
  const matches = await fastGlob(from, { cwd: basePath, dot: false })

  if (mustMatch && matches.length === 0) {
    throw new Error(`no file matched '${from}', which is required to build this widget`)
  }

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

module.exports = copyJob
