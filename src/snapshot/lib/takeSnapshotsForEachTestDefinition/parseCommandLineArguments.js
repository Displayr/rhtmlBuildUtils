
// NB avoid defaults for some of these values: if a default is specified then the arg object will contain the value, regardless of whether it was specified on command line.
// I only want to include it if it was provided.
// The defaults for these values are maintained in default.widget.config.js.

const yargs = require('yargs')
yargs.option('acceptNewSnapshots', {
  alias: 'a',
  describe: 'accept new snapshots',
  boolean: true,
  default: true
})
yargs.option('updateSnapshots', {
  alias: 'u',
  describe: 'accept all snapshots',
  boolean: true,
  default: false
})
yargs.option('branch', {
  alias: 'b',
  string: true,
  describe: 'which branch are we testing (used to choose snapshot set)'
})
yargs.option('env', {
  alias: 'e',
  string: true,
  describe: 'which env are we testing (used to choose snapshot set)',
  choices: ['local', 'travis']
})
yargs.option('testNamePattern', {
  alias: 't',
  string: true,
  describe: 'filter tests using pattern'
})
yargs.option('log', {
  alias: 'l',
  describe: 'echo browser ouptut',
  boolean: true
})
yargs.option('headless', {
  alias: 'h',
  describe: 'do not show browser during test',
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

module.exports = () => yargs.parse()
