// NB avoid defaults for env and branch: if a default is specified then the arg
// object contains the value regardless of whether it was given on the command
// line, which would override the widget's own config. Same convention as
// takeSnapshotsForEachTestDefinition.

const yargs = require('yargs')

module.exports = () => {
  yargs.option('from', {
    alias: 'f',
    string: true,
    describe: 'git ref holding the baselines to compare against, e.g. HEAD or a commit sha'
  })
  // NB deliberately no short alias. `-t` would be the obvious one, but yargs is a shared singleton
  // across the task modules and -t already means testNamePattern in jestSpecTests and
  // takeSnapshotsForEachTestDefinition. Declaring it twice with different meanings is a trap for
  // whoever hits it.
  yargs.option('to', {
    string: true,
    describe: 'git ref holding the new baselines. Omit to use the working tree'
  })
  yargs.option('env', {
    alias: 'e',
    string: true,
    describe: 'which snapshot env to review (defaults to the widget config)'
  })
  yargs.option('branch', {
    alias: 'b',
    string: true,
    describe: 'which snapshot branch to review (defaults to the widget config)'
  })
  return yargs.parse()
}
