// NB avoid defaults for some of these values: if a default is specified then the arg object will contain the value, regardless of whether it was specified on command line.
// I only want to include it if it was provided.
// The defaults for these values are maintained in default.widget.config.js.

const yargs = require('yargs')

module.exports = () => {
  // NB defaults to FALSE so that a snapshot with no baseline FAILS instead of being written and
  // passed -- otherwise a newly added test writes its own baseline and goes green forever, never
  // actually being regression tested.
  //
  // NB the default is not applied blindly: a snapshot set that has never been baselined is SEEDED
  // instead, because sets are keyed on <snapshotDirectory>/<env>/<branch> and nothing seeds a new
  // branch from master, so being strict there would fail every test on the first run of every
  // feature branch. src/lib/resolveAcceptNewSnapshots.js decides. Passing this flag forces seeding
  // even for a set that already exists.
  //
  // The flag is emitted BOTH ways (--ci=0 when accepting, --ci when not) rather than only when
  // accepting, because jest's ci option defaults to ci-info's isCI: omitting it would leave the
  // behaviour to whatever machine happens to be running. -u still overrides both.
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
