const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')

// Lists the baseline images under a snapshot tree, as posix relative paths.
//
// NB two directories inside that tree are NOT baselines and must be skipped:
//
//   new_snapshots/    written by the snapshot runner's catch block for a widget that failed
//   __diff_output__/  jest-image-snapshot's own diff images
//
// Both exist precisely after the failing visual run someone is sitting down to review, and neither
// exists at the ref being compared against -- so including them classifies every diagnostic image as a
// new baseline. That is worst exactly when the review page matters most: a run with many failures
// produces many diff images, and the genuinely new baselines are buried among them.
const NOT_BASELINES = ['new_snapshots', '__diff_output__']

const findBaselinePngs = (root) => {
  if (!fs.existsSync(root)) { return [] }

  const walk = (directory) => _.flatMap(fs.readdirSync(directory, { withFileTypes: true }), (entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return NOT_BASELINES.includes(entry.name) ? [] : walk(full)
    }
    return entry.name.endsWith('.png') ? [path.relative(root, full).split(path.sep).join('/')] : []
  })

  return walk(root)
}

module.exports = findBaselinePngs
