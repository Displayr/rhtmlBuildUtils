// Builds the jest command line for the visual snapshot run.
//
// NB the --ci flag is emitted BOTH ways on purpose, rather than only when accepting. jest's `ci`
// option defaults to ci-info's isCI (jest-config/build/Defaults.js), so omitting the flag does not
// mean "not accepting" -- it means "whatever this machine happens to be". On a developer machine that
// is false, jest computes updateSnapshot: 'new' (normalize.js), and jest-image-snapshot only fails a
// missing baseline when _updateSnapshot === 'none'. So a new visual test would write its own baseline
// and pass, on the very machine where new tests get added, while the README says a snapshot with no
// baseline fails. Emitting --ci explicitly makes the behaviour follow the flag instead of the
// environment.
const buildSnapshotJestCommand = ({ testRoots, jestPath, args }) => {
  const roots = testRoots.map(root => `--roots="${root}"`).join(' ')
  const acceptNewSnapshots = (args.acceptNewSnapshots) ? '--ci=0' : '--ci'
  const testNamePattern = (args.testNamePattern) ? `-t=${args.testNamePattern}` : ''
  // NB double quotes, not single: cmd.exe does not strip single quotes, so jest would receive them
  // as part of the pattern and match nothing. Double quotes work on both cmd.exe and posix shells.
  const testFilePattern = '--testMatch="**/*.jest.test.js"'
  const updateSnapshots = (args.updateSnapshots) ? '-u' : ''

  return `"${jestPath}" ${roots} ${testFilePattern} ${acceptNewSnapshots} ${updateSnapshots} ${testNamePattern}`
}

module.exports = buildSnapshotJestCommand
