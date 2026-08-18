const path = require('path')
const _ = require('lodash')

const findBaselinePngs = require('./findBaselinePngs')

// Decides whether a missing baseline should be written or should fail the run.
//
// NB `acceptNewSnapshots: false` exists so a NEW test cannot write its own baseline and pass forever,
// never actually being regression tested. But the same mechanism governs a second, legitimate case:
// snapshot sets are keyed on <snapshotDirectory>/<env>/<branch>, every widget's `localTest` passes
// --branch=$(git rev-parse --abbrev-ref HEAD), and nothing seeds a new branch's set from master. So on
// the first run of ANY feature branch every baseline is missing by design, and a flat strict default
// fails the whole suite with nothing to distinguish "not baselined yet" from "you broke the rendering".
// That is the per-branch loop docs/snapshotting_system.md describes, not an edge case.
//
// So the two are separated by asking whether the set has been baselined at all:
//
//   set has baselines  -> strict. A missing one is a new test, which is the case worth catching, and
//                         CI is always here because ci/master is committed.
//   set has none       -> seed it, and say so loudly. Nothing is compared, so nothing can be masked.
//
// NB the predicate is "holds at least one baseline", not "the directory exists":
// baseConfigureImageSnapshotMatcher mkdirp's the directory inside the jest child, so an aborted run
// leaves an empty one behind, and treating that as baselined would fail every test on the retry.
const resolveAcceptNewSnapshots = ({ widgetConfig, args }) => {
  const { branch, env, snapshotDirectory } = _.defaults(
    _.pick(args, ['branch', 'env', 'snapshotDirectory']),
    widgetConfig.snapshotTesting
  )

  const setRoot = path.join(widgetConfig.basePath, snapshotDirectory, env, branch)

  if (args.acceptNewSnapshots) {
    return { acceptNewSnapshots: true, seeding: false, setRoot, existingCount: null }
  }

  const existingCount = findBaselinePngs(setRoot).length

  return {
    acceptNewSnapshots: existingCount === 0,
    seeding: existingCount === 0,
    setRoot,
    existingCount
  }
}

module.exports = resolveAcceptNewSnapshots
