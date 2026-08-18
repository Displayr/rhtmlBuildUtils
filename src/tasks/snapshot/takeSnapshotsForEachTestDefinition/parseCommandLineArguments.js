// NB avoid defaults for some of these values: if a default is specified then the arg object will contain the value, regardless of whether it was specified on command line.
// I only want to include it if it was provided.
// The defaults for these values are maintained in default.widget.config.js.

const yargs = require('yargs')

module.exports = () => {
  // NB defaults to FALSE so that a snapshot with no baseline FAILS instead of being written and
  // passed. The flag is emitted BOTH ways (--ci=0 when accepting, --ci when not) rather than only
  // when accepting, because jest's ci option defaults to ci-info's isCI: omitting it would mean
  // "whatever this machine is", which on a developer machine is false, giving updateSnapshot:
  // 'new' and letting jest-image-snapshot write the missing baseline and pass -- on exactly the
  // machine where a new test gets added. Combined with baselines only leaving CI on an explicit
  // regeneration, such a test could look green forever while never being regression-tested at all.
  // Pass --acceptNewSnapshots to opt back in when bootstrapping a new suite.
  yargs.option('acceptNewSnapshots', {
    alias: 'a',
    describe: 'write and pass snapshots that have no baseline, instead of failing',
    boolean: true,
    default: false
  })
  yargs.option('branch', {
    alias: 'b',
    string: true,
    describe: 'which branch are we testing (used to choose snapshot set)'
  })
  // NB no `choices` whitelist. It previously allowed only 'local' and 'travis', so a CI environment
  // could not be named after the system actually running it -- rhtmlCombinedScatter had to bypass the
  // flag entirely by setting snapshotTesting.env in its own widget.config.js, which works only because
  // options without defaults are absent from the parsed args. The value is just a directory name under
  // snapshotDirectory, so any string is valid. Travis has not been in use for years.
  yargs.option('env', {
    alias: 'e',
    string: true,
    describe: 'which env are we testing, e.g. local or ci (chooses the snapshot set)'
  })
  yargs.option('headless', {
    alias: 'h',
    describe: 'do not show browser during test',
    boolean: true
  })
  yargs.option('log', {
    alias: 'l',
    describe: 'echo browser ouptut',
    boolean: true
  })
  yargs.option('slowMo', {
    alias: 's',
    number: true,
    describe: 'slow down browser interactions by milliseconds'
  })
  yargs.option('snapshotDirectory', {
    alias: 'd',
    string: true,
    describe: 'base snapshot directory'
  })
  yargs.option('testNamePattern', {
    alias: 't',
    string: true,
    describe: 'filter tests using pattern'
  })
  yargs.option('updateSnapshots', {
    alias: 'u',
    describe: 'accept all snapshots',
    boolean: true,
    default: false
  })
  return yargs.parse()
}
